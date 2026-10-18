import base64

import os

from datetime import date

import math

from functools import lru_cache

from typing import Any

import requests

TOKEN_URL = (

    "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/"

    "protocol/openid-connect/token"

)

PROCESS_URL = "https://sh.dataspace.copernicus.eu/process/v1"

STATISTICS_URL = "https://sh.dataspace.copernicus.eu/api/v1/statistics"

DEFAULT_TIMEOUT = 60

MAX_IMAGE_SIZE = 512

DEFAULT_RADIUS_DEGREES = 0.005

class SatelliteDataError(RuntimeError):

    """Raised when satellite data cannot be retrieved or processed."""

def _credentials() -> tuple[str, str]:

    client_id = os.getenv("COPERNICUS_CLIENT_ID", "").strip()

    client_secret = os.getenv("COPERNICUS_CLIENT_SECRET", "").strip()

    if not client_id or not client_secret:

        raise SatelliteDataError(

            "Satellite access is not configured. Set "

            "COPERNICUS_CLIENT_ID and COPERNICUS_CLIENT_SECRET "

            "in the backend environment."

        )

    return client_id, client_secret

@lru_cache(maxsize=1)

def _get_access_token() -> str:

    client_id, client_secret = _credentials()

    try:

        response = requests.post(

            TOKEN_URL,

            data={

                "grant_type": "client_credentials",

                "client_id": client_id,

                "client_secret": client_secret,

            },

            timeout=DEFAULT_TIMEOUT,

        )

        response.raise_for_status()

        payload = response.json()

    except requests.RequestException as exc:

        raise SatelliteDataError(

            "Could not authenticate with Copernicus Data Space."

        ) from exc

    except ValueError as exc:

        raise SatelliteDataError(

            "Copernicus returned an invalid authentication response."

        ) from exc

    token = payload.get("access_token")

    if not token:

        raise SatelliteDataError(

            "Copernicus authentication did not return an access token."

        )

    # The token is cached for this process. Clear the cache and retry

    # authentication if a request reports an expired/invalid token.

    return str(token)

def _request_headers() -> dict[str, str]:

    return {

        "Authorization": f"Bearer {_get_access_token()}",

        "Content-Type": "application/json",

    }

def _post_json(

    url: str,

    payload: dict[str, Any],

) -> requests.Response:

    try:

        response = requests.post(

            url,

            headers=_request_headers(),

            json=payload,

            timeout=DEFAULT_TIMEOUT,

        )

        if response.status_code == 401:

            _get_access_token.cache_clear()

            response = requests.post(

                url,

                headers=_request_headers(),

                json=payload,

                timeout=DEFAULT_TIMEOUT,

            )

        if response.status_code == 401:

            raise SatelliteDataError(

                "Copernicus rejected the credentials. Check the OAuth client."

            )

        if response.status_code == 429:

            raise SatelliteDataError(

                "Copernicus rate limit reached. Please try again later."

            )

        response.raise_for_status()

        return response

    except SatelliteDataError:

        raise

    except requests.HTTPError as exc:

        status = exc.response.status_code if exc.response is not None else 0

        detail = ""

        if exc.response is not None:

            detail = exc.response.text[:500]

        raise SatelliteDataError(

            f"Copernicus request failed (HTTP {status}). {detail}"

        ) from exc

    except requests.RequestException as exc:

        raise SatelliteDataError(

            "Could not connect to the Copernicus satellite service."

        ) from exc

def _validate_coordinates(

    latitude: float,

    longitude: float,

) -> None:

    if not -90 <= latitude <= 90:

        raise SatelliteDataError("Latitude must be between -90 and 90.")

    if not -180 <= longitude <= 180:

        raise SatelliteDataError("Longitude must be between -180 and 180.")

def _validate_dates(

    start_date: str,

    end_date: str,

) -> tuple[date, date]:

    try:

        start = date.fromisoformat(start_date)

        end = date.fromisoformat(end_date)

    except (TypeError, ValueError) as exc:

        raise SatelliteDataError(

            "Dates must use YYYY-MM-DD format."

        ) from exc

    if start > end:

        raise SatelliteDataError(

            "The start date must be before or equal to the end date."

        )

    if end > date.today():

        raise SatelliteDataError(

            "The end date cannot be in the future."

        )

    if (end - start).days > 365:

        raise SatelliteDataError(

            "A single satellite request cannot exceed 366 calendar days."

        )

    return start, end

def _make_bbox(

    latitude: float,

    longitude: float,

    radius_degrees: float = DEFAULT_RADIUS_DEGREES,

) -> list[float]:

    """

    Create an approximate bounding box around a farm's saved point.

    This is NOT the farm boundary. Use a real farm polygon when available.

    """

    _validate_coordinates(latitude, longitude)

    if not 0.0005 <= radius_degrees <= 0.05:

        raise SatelliteDataError(

            "radius_degrees must be between 0.0005 and 0.05."

        )

    min_lat = max(-90.0, latitude - radius_degrees)

    max_lat = min(90.0, latitude + radius_degrees)

    # Adjust longitude span for latitude, avoiding division by zero

    # close to the poles.

    cosine = max(abs(math.cos(math.radians(latitude))), 0.01)

    longitude_radius = min(radius_degrees / cosine, 180.0)

    min_lon = max(-180.0, longitude - longitude_radius)

    max_lon = min(180.0, longitude + longitude_radius)

    return [min_lon, min_lat, max_lon, max_lat]

NDVI_EVALSCRIPT = """

//VERSION=3

function setup() {

  return {

    input: [{

      bands: ["B04", "B08", "SCL", "dataMask"]

    }],

    output: {

      bands: 4,

      sampleType: "AUTO"

    }

  };

}

function evaluatePixel(sample) {

  if (

    sample.dataMask === 0 ||

    sample.SCL === 3 ||

    sample.SCL === 8 ||

    sample.SCL === 9 ||

    sample.SCL === 10 ||

    sample.SCL === 11

  ) {

    return [0.45, 0.45, 0.45, 1];

  }

  const denominator = sample.B08 + sample.B04;

  if (denominator === 0) {

    return [0.45, 0.45, 0.45, 1];

  }

  const ndvi = (sample.B08 - sample.B04) / denominator;

  // Smooth continuous scale: brown -> yellow -> light green -> dark green.

  const stops = [

    { value: -1.0, color: [0.45, 0.12, 0.08] },

    { value:  0.0, color: [0.80, 0.65, 0.25] },

    { value:  0.2, color: [0.95, 0.90, 0.35] },

    { value:  0.4, color: [0.45, 0.80, 0.30] },

    { value:  0.7, color: [0.05, 0.45, 0.15] },

    { value:  1.0, color: [0.00, 0.25, 0.08] }

  ];

  const value = Math.max(-1, Math.min(1, ndvi));

  for (let i = 0; i < stops.length - 1; i++) {

    const a = stops[i];

    const b = stops[i + 1];

    if (value <= b.value) {

      const t = (value - a.value) / (b.value - a.value);

      return [

        a.color[0] + t * (b.color[0] - a.color[0]),

        a.color[1] + t * (b.color[1] - a.color[1]),

        a.color[2] + t * (b.color[2] - a.color[2]),

        1

      ];

    }

  }

  const last = stops[stops.length - 1];

  return [last.color[0], last.color[1], last.color[2], 1];

}

"""

TRUE_COLOR_EVALSCRIPT = """

//VERSION=3

function setup() {

  return {

    input: [{

      bands: ["B04", "B03", "B02", "SCL", "dataMask"]

    }],

    output: {

      bands: 3,

      sampleType: "AUTO"

    }

  };

}

function evaluatePixel(sample) {

  if (sample.dataMask === 0 || sample.SCL === 3 ||

      sample.SCL === 8 || sample.SCL === 9 ||

      sample.SCL === 10 || sample.SCL === 11) {

    return [0.75, 0.75, 0.75];

  }

  // Simple true-colour display stretch.

  return [

    Math.min(1, sample.B04 * 2.5),

    Math.min(1, sample.B03 * 2.5),

    Math.min(1, sample.B02 * 2.5)

  ];

}

"""

NDVI_STATS_EVALSCRIPT = """
//VERSION=3

function setup() {
  return {
    input: [{
      bands: ["B04", "B08", "SCL", "dataMask"]
    }],
    output: [
      { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}

function evaluatePixel(sample) {
  const denominator = sample.B08 + sample.B04;

  const invalid =
    sample.dataMask === 0 ||
    sample.SCL === 3 ||
    sample.SCL === 8 ||
    sample.SCL === 9 ||
    sample.SCL === 10 ||
    sample.SCL === 11 ||
    !isFinite(denominator) ||
    denominator <= 0;

  if (invalid) {
    return {
      ndvi: [0],
      dataMask: [0]
    };
  }

  const ndvi = (sample.B08 - sample.B04) / denominator;

  if (!isFinite(ndvi) || ndvi < -1 || ndvi > 1) {
    return {
      ndvi: [0],
      dataMask: [0]
    };
  }

  return {
    ndvi: [ndvi],
    dataMask: [1]
  };
}
"""

def get_satellite_image(

    latitude: float,

    longitude: float,

    start_date: str,

    end_date: str,

    image_type: str = "ndvi",

    max_cloud_coverage: int = 30,

    radius_degrees: float = DEFAULT_RADIUS_DEGREES,

) -> dict[str, Any]:

    """

    Return a real Sentinel-2 rendered image as a base64 data URL.

    image_type: 'ndvi' or 'true_color'

    """

    start, end = _validate_dates(start_date, end_date)

    _validate_coordinates(latitude, longitude)

    if image_type not in {"ndvi", "true_color"}:

        raise SatelliteDataError(

            "image_type must be 'ndvi' or 'true_color'."

        )

    if not 0 <= max_cloud_coverage <= 100:

        raise SatelliteDataError(

            "max_cloud_coverage must be between 0 and 100."

        )

    bbox = _make_bbox(latitude, longitude, radius_degrees)

    evalscript = (

        NDVI_EVALSCRIPT

        if image_type == "ndvi"

        else TRUE_COLOR_EVALSCRIPT

    )

    payload = {

        "input": {

            "bounds": {

                "bbox": bbox,

                "properties": {

                    "crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"

                },

            },

            "data": [

                {

                    "type": "sentinel-2-l2a",

                    "dataFilter": {

                        "timeRange": {

                            "from": f"{start.isoformat()}T00:00:00Z",

                            "to": f"{end.isoformat()}T23:59:59Z",

                        },

                        "maxCloudCoverage": max_cloud_coverage,

                        "mosaickingOrder": "leastCC",

                    },

                }

            ],

        },

        "output": {

            "width": MAX_IMAGE_SIZE,

            "height": MAX_IMAGE_SIZE,

            "responses": [

                {

                    "identifier": "default",

                    "format": {"type": "image/png"},

                }

            ],

        },

        "evalscript": evalscript,

    }

    response = _post_json(PROCESS_URL, payload)

    content_type = response.headers.get("content-type", "")

    if "image/" not in content_type:

        raise SatelliteDataError(

            "Copernicus did not return an image. "

            "Try another date range or a lower cloud threshold."

        )

    image_base64 = base64.b64encode(response.content).decode("ascii")

    return {

        "image_type": image_type,

        "image_data_url": f"data:image/png;base64,{image_base64}",

        "content_type": "image/png",

        "start_date": start.isoformat(),

        "end_date": end.isoformat(),

        "bbox": bbox,

        "source": "Copernicus Sentinel-2 L2A",

        "is_real_satellite_data": True,

        "area_note": (

            "Image covers an approximate bounding box around the farm "

            "coordinates, not a verified farm boundary."

        ),

    }

def get_ndvi_statistics(

    latitude: float,

    longitude: float,

    start_date: str,

    end_date: str,

    radius_degrees: float = DEFAULT_RADIUS_DEGREES,

    max_cloud_coverage: int = 30,

) -> dict[str, Any]:

    """

    Calculate real NDVI statistics from Sentinel-2 imagery.

    Returns per-interval statistics from the Copernicus Statistical API.

    """

    start, end = _validate_dates(start_date, end_date)

    _validate_coordinates(latitude, longitude)

    if not 0 <= max_cloud_coverage <= 100:

        raise SatelliteDataError(

            "max_cloud_coverage must be between 0 and 100."

        )

    bbox = _make_bbox(latitude, longitude, radius_degrees)

    payload = {

        "input": {

            "bounds": {

                "bbox": bbox,

                "properties": {

                    "crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"

                },

            },

            "data": [

                {

                    "type": "sentinel-2-l2a",

                    "dataFilter": {

                        "timeRange": {

                            "from": f"{start.isoformat()}T00:00:00Z",

                            "to": f"{end.isoformat()}T23:59:59Z",

                        },

                        "maxCloudCoverage": max_cloud_coverage,

                        "mosaickingOrder": "leastCC",

                    },

                }

            ],

        },

        "aggregation": {

            "timeRange": {

                "from": f"{start.isoformat()}T00:00:00Z",

                "to": f"{end.isoformat()}T23:59:59Z",

            },

            "aggregationInterval": {"of": "P1D"},

            "resx": 10,

            "resy": 10,

            "evalscript": NDVI_STATS_EVALSCRIPT,

        },

    }

    response = _post_json(STATISTICS_URL, payload)

    try:

        result = response.json()

    except ValueError as exc:

        raise SatelliteDataError(

            "Copernicus returned invalid NDVI statistics."

        ) from exc

    if not isinstance(result, dict):

        raise SatelliteDataError("Copernicus returned an unexpected statistics response.")

    observations = []

    for item in result.get("data", []):

        if not isinstance(item, dict):

            continue

        outputs = item.get("outputs") or {}

        ndvi_output = outputs.get("ndvi") or {}

        bands = ndvi_output.get("bands") or {}

        band_stats = (bands.get("B0") or {}).get("stats") or {}

        # Be defensive about response variations while still requiring a real mean.

        mean = band_stats.get("mean")

        if mean is None:

            continue

        try:

            mean = float(mean)

        except (TypeError, ValueError):

            continue

        if not math.isfinite(mean) or not -1 <= mean <= 1:

            continue

        interval = item.get("interval") or {}

        raw_date = interval.get("from")

        observation_date = raw_date[:10] if isinstance(raw_date, str) else None

        def finite_stat(name: str):

            value = band_stats.get(name)

            try:

                value = float(value) if value is not None else None

            except (TypeError, ValueError):

                return None

            return value if value is not None and math.isfinite(value) else None

        observations.append(

            {

                "date": observation_date,

                "mean_ndvi": mean,

                "min_ndvi": finite_stat("min"),

                "max_ndvi": finite_stat("max"),

                "standard_deviation": finite_stat("stDev"),

                "sample_count": band_stats.get("sampleCount", 0),

                "no_data_count": band_stats.get("noDataCount", 0),

            }

        )

    if not observations:

        raise SatelliteDataError(

            "No usable NDVI observations were found for this period. "

            "Try a wider date range or a higher cloud threshold."

        )

    observations.sort(key=lambda item: item["date"] or "")

    return {

        "start_date": start.isoformat(),

        "end_date": end.isoformat(),

        "bbox": bbox,

        "source": "Copernicus Sentinel-2 L2A",

        "observations": observations,

        "observation_count": len(observations),

        "area_note": (

            "Statistics describe the approximate bounding box around "

            "the farm coordinates, not a verified farm boundary."

        ),

    }

def compare_ndvi_periods(

    latitude: float,

    longitude: float,

    first_start_date: str,

    first_end_date: str,

    second_start_date: str,

    second_end_date: str,

    radius_degrees: float = DEFAULT_RADIUS_DEGREES,

    max_cloud_coverage: int = 30,

) -> dict[str, Any]:

    """Compare average NDVI across two date ranges using real observations."""

    first = get_ndvi_statistics(

        latitude,

        longitude,

        first_start_date,

        first_end_date,

        radius_degrees,

        max_cloud_coverage,

    )

    second = get_ndvi_statistics(

        latitude,

        longitude,

        second_start_date,

        second_end_date,

        radius_degrees,

        max_cloud_coverage,

    )

    first_values = [item["mean_ndvi"] for item in first["observations"]]

    second_values = [item["mean_ndvi"] for item in second["observations"]]

    if not first_values or not second_values:

        raise SatelliteDataError(

            "Both comparison periods must contain usable NDVI observations."

        )

    first_mean = sum(first_values) / len(first_values)

    second_mean = sum(second_values) / len(second_values)

    change = second_mean - first_mean

    return {

        "source": "Copernicus Sentinel-2 L2A",

        "first_period": {

            "start_date": first_start_date,

            "end_date": first_end_date,

            "mean_ndvi": first_mean,

            "observation_count": len(first_values),

        },

        "second_period": {

            "start_date": second_start_date,

            "end_date": second_end_date,

            "mean_ndvi": second_mean,

            "observation_count": len(second_values),

        },

        "ndvi_change": change,

        "change_percentage_points": change * 100,

        "interpretation": (

            "Higher average NDVI"

            if change > 0.02

            else "Lower average NDVI"

            if change < -0.02

            else "No substantial NDVI change"

        ),

        "area_note": first["area_note"],

    }
