
import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  LayersControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { Farm } from "../../services/farms";

type FarmMapProps = {
  farms: Farm[];
  language?: "ar" | "en";
  height?: number;
};

const { BaseLayer, Overlay } = LayersControl;

const farmIcon = L.divIcon({
  className: "farm-map-marker",
  html: `<div style="
    background:#16a34a;
    width:34px;
    height:34px;
    border:3px solid white;
    border-radius:50%;
    display:flex;
    align-items:center;
    justify-content:center;
    box-shadow:0 4px 12px rgba(0,0,0,.25);
    font-size:17px;
  ">🌱</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -17],
});

type Coordinates = [number, number];

function FitFarmBounds({
  positions,
}: {
  positions: Coordinates[];
}) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) return;

    if (positions.length === 1) {
      map.setView(positions[0], 16);
      return;
    }

    map.fitBounds(L.latLngBounds(positions), {
      padding: [40, 40],
      maxZoom: 16,
    });
  }, [map, positions]);

  return null;
}

export default function FarmMap({
  farms,
  language = "en",
  height = 400,
}: FarmMapProps) {
  const isArabic = language === "ar";

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

  const positions = useMemo<Coordinates[]>(
    () =>
      mappedFarms.map((farm) => [
        Number(farm.latitude),
        Number(farm.longitude),
      ]),
    [mappedFarms]
  );

  const defaultCenter: Coordinates = [26.8206, 30.8025];

  return (
    <div style={{ width: "100%" }}>
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
            {isArabic
              ? "خريطة المزارع والأقمار الصناعية"
              : "Satellite & Farm Intelligence Map"}
          </h3>

          <p style={{ margin: "6px 0 0", opacity: 0.7 }}>
            {isArabic
              ? "استكشف الأراضي والطرق والعمران من الصور الفضائية، وتحكم في الطبقات."
              : "Explore satellite imagery, roads and places. Toggle map layers as needed."}
          </p>
        </div>

        <span
          style={{
            background: "rgba(22,163,74,.12)",
            color: "#16a34a",
            padding: "8px 14px",
            borderRadius: 20,
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          🌱 {mappedFarms.length}{" "}
          {isArabic ? "مزرعة على الخريطة" : "Mapped Farms"}
        </span>
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
        }}
      >
        <MapContainer
          center={defaultCenter}
          zoom={6}
          minZoom={2}
          maxZoom={19}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <LayersControl position="topright">
            {/* Satellite imagery is the default base layer */}
            <BaseLayer
              checked
              name={isArabic ? "صور الأقمار الصناعية" : "Satellite Imagery"}
            >
              <TileLayer
                attribution='Imagery &copy; <a href="https://www.esri.com/">Esri</a> and its imagery providers'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
                maxNativeZoom={19}
              />
            </BaseLayer>

            <BaseLayer
              name={isArabic ? "خريطة الشوارع" : "Street Map"}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />
            </BaseLayer>

            {/* Roads and transport overlay */}
            <Overlay
              checked
              name={isArabic ? "الطرق والمواصلات" : "Roads & Transportation"}
            >
              <TileLayer
                attribution='Road data: Esri, HERE, Garmin and OpenStreetMap contributors'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
            </Overlay>

            {/* Place names and reference labels */}
            <Overlay
              checked
              name={isArabic ? "أسماء الأماكن والحدود" : "Place Names & Boundaries"}
            >
              <TileLayer
                attribution='Place reference: Esri and its data providers'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
            </Overlay>
          </LayersControl>

          <FitFarmBounds positions={positions} />

          {mappedFarms.map((farm) => (
            <Marker
              key={farm.id}
              position={[
                Number(farm.latitude),
                Number(farm.longitude),
              ]}
              icon={farmIcon}
            >
              <Popup>
                <div style={{ minWidth: 190 }}>
                  <h3 style={{ margin: "0 0 10px" }}>
                    🌱 {farm.name}
                  </h3>

                  <p>
                    <strong>{isArabic ? "الموقع:" : "Location:"}</strong>{" "}
                    {farm.location}
                  </p>

                  <p>
                    <strong>{isArabic ? "المساحة:" : "Area:"}</strong>{" "}
                    {farm.area_hectares} ha
                  </p>

                  <p>
                    <strong>{isArabic ? "المحصول:" : "Crop:"}</strong>{" "}
                    {farm.current_crop || "—"}
                  </p>

                  <p>
                    <strong>{isArabic ? "التربة:" : "Soil:"}</strong>{" "}
                    {farm.soil_type}
                  </p>

                  <a
                    href={`https://www.google.com/maps?q=${farm.latitude},${farm.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {isArabic
                      ? "فتح الموقع في Google Maps"
                      : "Open in Google Maps"}
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {mappedFarms.length === 0 && (
          <div
            style={{
              position: "absolute",
              top: 65,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1000,
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
            {isArabic
              ? "لا توجد مزارع بإحداثيات مسجلة حتى الآن"
              : "No farms with saved coordinates yet"}
          </div>
        )}
      </div>
    </div>
  );
}
