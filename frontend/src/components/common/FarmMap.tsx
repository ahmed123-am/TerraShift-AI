
import { useCallback, useMemo, useState } from "react";
import {
  GoogleMap,
  InfoWindowF,
  MarkerF,
  useJsApiLoader,
} from "@react-google-maps/api";

import type { Farm } from "../../services/farms";

type FarmMapProps = {
  farms: Farm[];
  language?: "ar" | "en";
  height?: number;
};

type Coordinates = {
  lat: number;
  lng: number;
};

const containerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter: Coordinates = {
  lat: 26.8206,
  lng: 30.8025,
};

const mapOptions: google.maps.MapOptions = {
  mapTypeId: "hybrid",
  mapTypeControl: true,
  mapTypeControlOptions: {
    style: 2,
    position: 3,
    mapTypeIds: ["roadmap", "satellite", "hybrid", "terrain"],
  },
  streetViewControl: false,
  fullscreenControl: true,
  zoomControl: true,
  clickableIcons: false,
  gestureHandling: "greedy",
};

export default function FarmMap({
  farms,
  language = "en",
  height = 400,
}: FarmMapProps) {
  const isArabic = language === "ar";

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  const { isLoaded, loadError } = useJsApiLoader({
    id: "terrashift-google-maps",
    googleMapsApiKey: apiKey,
  });

  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const mappedFarms = useMemo(
    () =>
      farms.filter((farm) => {
        if (
          farm.latitude === null ||
          farm.latitude === undefined ||
          farm.longitude === null ||
          farm.longitude === undefined
        ) {
          return false;
        }

        const lat = Number(farm.latitude);
        const lng = Number(farm.longitude);

        return (
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          lat >= -90 &&
          lat <= 90 &&
          lng >= -180 &&
          lng <= 180
        );
      }),
    [farms]
  );

  const onMapLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      setMap(mapInstance);

      if (mappedFarms.length === 0) return;

      const bounds = new google.maps.LatLngBounds();

      mappedFarms.forEach((farm) => {
        bounds.extend({
          lat: Number(farm.latitude),
          lng: Number(farm.longitude),
        });
      });

      mapInstance.fitBounds(bounds, 50);

      if (mappedFarms.length === 1) {
        mapInstance.setZoom(16);
      }
    },
    [mappedFarms]
  );

  const fitAllFarms = useCallback(() => {
    if (!map || mappedFarms.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    mappedFarms.forEach((farm) => {
      bounds.extend({
        lat: Number(farm.latitude),
        lng: Number(farm.longitude),
      });
    });

    map.fitBounds(bounds, 50);

    if (mappedFarms.length === 1) {
      map.setZoom(16);
    }

    setSelectedFarm(null);
  }, [map, mappedFarms]);

  const openFarm = useCallback(
    (farm: Farm) => {
      setSelectedFarm(farm);

      if (!map) return;

      const position = {
        lat: Number(farm.latitude),
        lng: Number(farm.longitude),
      };

      map.panTo(position);
      map.setZoom(16);
    },
    [map]
  );

  const copy = {
    title: isArabic
      ? "خريطة المزارع والأقمار الصناعية"
      : "Satellite & Farm Intelligence Map",

    subtitle: isArabic
      ? "استكشف مواقع مزارعك باستخدام خرائط جوجل والصور الفضائية."
      : "Explore your farms using Google Maps and satellite imagery.",

    mapped: isArabic ? "مزرعة على الخريطة" : "Mapped Farms",

    loading: isArabic
      ? "جاري تحميل خرائط Google..."
      : "Loading Google Maps...",

    missingKey: isArabic
      ? "مفتاح Google Maps API غير موجود. أضفه في ملف .env."
      : "Google Maps API key is missing. Add it to your .env file.",

    loadError: isArabic
      ? "تعذر تحميل Google Maps. تأكد من المفتاح وإعدادات Google Cloud."
      : "Could not load Google Maps. Check your API key and Google Cloud settings.",

    noFarms: isArabic
      ? "لا توجد مزارع بإحداثيات مسجلة حتى الآن."
      : "No farms with saved coordinates yet.",

    location: isArabic ? "الموقع" : "Location",
    area: isArabic ? "المساحة" : "Area",
    crop: isArabic ? "المحصول" : "Crop",
    soil: isArabic ? "التربة" : "Soil",
    openGoogle: isArabic
      ? "فتح الموقع في Google Maps"
      : "Open in Google Maps",
    fitAll: isArabic ? "عرض كل المزارع" : "Show all farms",
  };

  return (
    <div
      style={{
        width: "100%",
        direction: isArabic ? "rtl" : "ltr",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: 20 }}>
            {copy.title}
          </h3>

          <p style={{ margin: "6px 0 0", opacity: 0.7 }}>
            {copy.subtitle}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span
            style={{
              background: "rgba(22,163,74,.12)",
              color: "#16a34a",
              padding: "8px 14px",
              borderRadius: 20,
              fontWeight: 700,
              fontSize: 13,
              whiteSpace: "nowrap",
            }}
          >
            🌱 {mappedFarms.length} {copy.mapped}
          </span>

          {isLoaded && mappedFarms.length > 0 && (
            <button
              type="button"
              onClick={fitAllFarms}
              style={{
                border: "1px solid rgba(128,128,128,.3)",
                borderRadius: 20,
                padding: "8px 14px",
                cursor: "pointer",
                background: "transparent",
                fontWeight: 600,
              }}
            >
              {copy.fitAll}
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          height,
          width: "100%",
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(128,128,128,.2)",
          position: "relative",
          zIndex: 0,
          background: "#e5e7eb",
        }}
      >
        {!apiKey ? (
          <div
            style={{
              height: "100%",
              display: "grid",
              placeItems: "center",
              padding: 20,
              textAlign: "center",
              color: "#334155",
            }}
          >
            <div>
              <div style={{ fontSize: 36 }}>🗺️</div>
              <strong>{copy.missingKey}</strong>
            </div>
          </div>
        ) : loadError ? (
          <div
            style={{
              height: "100%",
              display: "grid",
              placeItems: "center",
              padding: 20,
              textAlign: "center",
              color: "#b91c1c",
            }}
          >
            {copy.loadError}
          </div>
        ) : !isLoaded ? (
          <div
            style={{
              height: "100%",
              display: "grid",
              placeItems: "center",
              color: "#334155",
            }}
          >
            {copy.loading}
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={defaultCenter}
            zoom={6}
            options={mapOptions}
            onLoad={onMapLoad}
          >
            {mappedFarms.map((farm) => (
              <MarkerF
                key={farm.id}
                position={{
                  lat: Number(farm.latitude),
                  lng: Number(farm.longitude),
                }}
                title={farm.name}
                label={{
                  text: "🌱",
                  fontSize: "20px",
                }}
                onClick={() => openFarm(farm)}
              />
            ))}

            {selectedFarm && (
              <InfoWindowF
                position={{
                  lat: Number(selectedFarm.latitude),
                  lng: Number(selectedFarm.longitude),
                }}
                onCloseClick={() => setSelectedFarm(null)}
              >
                <div
                  style={{
                    minWidth: 190,
                    maxWidth: 260,
                    direction: isArabic ? "rtl" : "ltr",
                    color: "#1f2937",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>
                    🌱 {selectedFarm.name}
                  </h3>

                  <p>
                    <strong>{copy.location}:</strong>{" "}
                    {selectedFarm.location}
                  </p>

                  <p>
                    <strong>{copy.area}:</strong>{" "}
                    {selectedFarm.area_hectares} ha
                  </p>

                  <p>
                    <strong>{copy.crop}:</strong>{" "}
                    {selectedFarm.current_crop || "—"}
                  </p>

                  <p>
                    <strong>{copy.soil}:</strong>{" "}
                    {selectedFarm.soil_type}
                  </p>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedFarm.latitude},${selectedFarm.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#15803d",
                      fontWeight: 700,
                    }}
                  >
                    {copy.openGoogle} ↗
                  </a>
                </div>
              </InfoWindowF>
            )}
          </GoogleMap>
        )}

        {mappedFarms.length === 0 && apiKey && isLoaded && (
          <div
            style={{
              position: "absolute",
              top: 65,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10,
              background: "white",
              color: "#334155",
              borderRadius: 12,
              padding: "12px 18px",
              boxShadow: "0 4px 16px rgba(0,0,0,.12)",
              maxWidth: "90%",
              textAlign: "center",
              fontSize: 13,
            }}
          >
            {copy.noFarms}
          </div>
        )}
      </div>
    </div>
  );
}
