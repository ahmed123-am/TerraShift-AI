
import { apiRequest } from "./api";

export type SatelliteImageType = "ndvi" | "true_color";

export interface SatelliteImageResponse {
  farm_id: number;
  farm_name: string;
  image_type: SatelliteImageType;
  image_data_url: string;
  content_type: string;
  start_date: string;
  end_date: string;
  bbox: [number, number, number, number] | number[];
  source: string;
  is_real_satellite_data: boolean;
  area_note: string;
}

export interface NdviObservation {
  date: string | null;
  mean_ndvi: number;
  min_ndvi: number | null;
  max_ndvi: number | null;
  standard_deviation: number | null;
  sample_count: number;
  no_data_count: number;
}

export interface NdviStatisticsResponse {
  farm_id: number;
  farm_name: string;
  start_date: string;
  end_date: string;
  bbox: [number, number, number, number] | number[];
  source: string;
  observations: NdviObservation[];
  observation_count: number;
  area_note: string;
}

export interface NdviComparisonPeriod {
  start_date: string;
  end_date: string;
  mean_ndvi: number;
  observation_count: number;
}

export interface NdviComparisonResponse {
  farm_id: number;
  farm_name: string;
  source: string;
  first_period: NdviComparisonPeriod;
  second_period: NdviComparisonPeriod;
  ndvi_change: number;
  change_percentage_points: number;
  interpretation: string;
  area_note: string;
}

export interface SatelliteQueryOptions {
  maxCloudCoverage?: number;
}

function validateDateRange(
  startDate: string,
  endDate: string
): void {
  const isValidDate = (value: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const date = new Date(`${value}T00:00:00Z`);

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  };

  if (!isValidDate(startDate)) {
    throw new Error("Start date must be a valid date in YYYY-MM-DD format.");
  }

  if (!isValidDate(endDate)) {
    throw new Error("End date must be a valid date in YYYY-MM-DD format.");
  }

  if (startDate > endDate) {
    throw new Error(
      "Start date must be before or equal to end date."
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  if (endDate > today) {
    throw new Error("End date cannot be in the future.");
  }
}

function validateFarmId(farmId: number): void {
  if (!Number.isInteger(farmId) || farmId <= 0) {
    throw new Error("Farm ID must be a positive integer.");
  }
}

function queryString(
  params: Record<string, string | number>
): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, String(value));
  });

  return searchParams.toString();
}

function cloudCoverageParam(
  options?: SatelliteQueryOptions
): number {
  const value = options?.maxCloudCoverage ?? 30;

  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new Error(
      "Maximum cloud coverage must be an integer from 0 to 100."
    );
  }

  return value;
}

/**
 * Fetch a Sentinel-2 image for a geolocated farm.
 */
export async function getSatelliteImage(
  farmId: number,
  startDate: string,
  endDate: string,
  imageType: SatelliteImageType = "ndvi",
  options?: SatelliteQueryOptions
): Promise<SatelliteImageResponse> {
  validateFarmId(farmId);
  validateDateRange(startDate, endDate);

  if (imageType !== "ndvi" && imageType !== "true_color") {
    throw new Error("Unsupported satellite image type.");
  }

  const params = queryString({
    start_date: startDate,
    end_date: endDate,
    image_type: imageType,
    max_cloud_coverage: cloudCoverageParam(options),
  });

  return apiRequest<SatelliteImageResponse>(
    `/api/farms/${farmId}/satellite/image?${params}`,
    { timeoutMs: 120000 }
  );
}

/**
 * Fetch NDVI statistics from the Copernicus Statistical API.
 */
export async function getFarmNdviStatistics(
  farmId: number,
  startDate: string,
  endDate: string,
  options?: SatelliteQueryOptions
): Promise<NdviStatisticsResponse> {
  validateFarmId(farmId);
  validateDateRange(startDate, endDate);

  const params = queryString({
    start_date: startDate,
    end_date: endDate,
    max_cloud_coverage: cloudCoverageParam(options),
  });

  return apiRequest<NdviStatisticsResponse>(
    `/api/farms/${farmId}/satellite/ndvi?${params}`,
    { timeoutMs: 120000 }
  );
}

/**
 * Compare NDVI across two date ranges for the same farm.
 */
export async function compareFarmNdvi(
  farmId: number,
  firstStartDate: string,
  firstEndDate: string,
  secondStartDate: string,
  secondEndDate: string,
  options?: SatelliteQueryOptions
): Promise<NdviComparisonResponse> {
  validateFarmId(farmId);

  validateDateRange(firstStartDate, firstEndDate);
  validateDateRange(secondStartDate, secondEndDate);

  const params = queryString({
    first_start_date: firstStartDate,
    first_end_date: firstEndDate,
    second_start_date: secondStartDate,
    second_end_date: secondEndDate,
    max_cloud_coverage: cloudCoverageParam(options),
  });

  return apiRequest<NdviComparisonResponse>(
    `/api/farms/${farmId}/satellite/compare?${params}`,
    { timeoutMs: 180000 }
  );
}
