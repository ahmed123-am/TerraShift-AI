
import { useState, type FormEvent } from "react";
import {
  GoogleMap,
  MarkerF,
  useJsApiLoader,
} from "@react-google-maps/api";

import type { CreateFarmData } from "../../services/farms";

import "./AddFarmModal.css";

type AddFarmModalProps = {
  language: "ar" | "en";
  onClose: () => void;
  onSubmit: (data: CreateFarmData) => Promise<void>;
  isSaving: boolean;
};

type Coordinates = {
  lat: number;
  lng: number;
};

const mapContainerStyle = {
  width: "100%",
  height: "320px",
  borderRadius: "12px",
};

const defaultCenter: Coordinates = {
  lat: 31.4175,
  lng: 31.8144,
};

const mapOptions: google.maps.MapOptions = {
  mapTypeId: "hybrid",
  mapTypeControl: true,
  streetViewControl: false,
  fullscreenControl: true,
  zoomControl: true,
  clickableIcons: false,
  gestureHandling: "greedy",
};

export default function AddFarmModal({
  language,
  onClose,
  onSubmit,
  isSaving,
}: AddFarmModalProps) {
  const isArabic = language === "ar";

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  const { isLoaded, loadError } = useJsApiLoader({
    id: "terrashift-google-maps",
    googleMapsApiKey: apiKey,
  });

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [area, setArea] = useState("");

  const [soilType, setSoilType] =
    useState<CreateFarmData["soil_type"]>("clay");

  const [currentCrop, setCurrentCrop] = useState("");

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [error, setError] = useState("");

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [selectedPosition, setSelectedPosition] =
    useState<Coordinates | null>(null);

  const [confirmedPosition, setConfirmedPosition] =
    useState<Coordinates | null>(null);

  const getInitialPosition = (): Coordinates => {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
      latitude.trim() !== "" &&
      longitude.trim() !== "" &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return { lat, lng };
    }

    return defaultCenter;
  };

  const openMapPicker = () => {
    setError("");

    const position = getInitialPosition();

    setSelectedPosition(position);
    setConfirmedPosition(null);
    setShowMapPicker(true);
  };

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (!event.latLng) return;

    const position = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
    };

    setSelectedPosition(position);
  };

  const handleMarkerDrag = (
    event: google.maps.MapMouseEvent
  ) => {
    if (!event.latLng) return;

    setSelectedPosition({
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
    });
  };

  const confirmMapLocation = () => {
    if (!selectedPosition) {
      setError(
        isArabic
          ? "حدد موقع المزرعة على الخريطة أولًا."
          : "Please select a farm location on the map first."
      );
      return;
    }

    setLatitude(selectedPosition.lat.toFixed(7));
    setLongitude(selectedPosition.lng.toFixed(7));

    setConfirmedPosition(selectedPosition);
    setShowMapPicker(false);
    setError("");
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    const areaNumber = Number(area);

    if (!name.trim() || !location.trim() || !currentCrop.trim()) {
      setError(
        isArabic
          ? "من فضلك املأ اسم المزرعة والموقع والمحصول."
          : "Please enter the farm name, location, and crop."
      );
      return;
    }

    if (!Number.isFinite(areaNumber) || areaNumber <= 0) {
      setError(
        isArabic
          ? "اكتب مساحة صحيحة أكبر من صفر."
          : "Enter a valid area greater than zero."
      );
      return;
    }

    const hasLatitude = latitude.trim() !== "";
    const hasLongitude = longitude.trim() !== "";

    if (hasLatitude !== hasLongitude) {
      setError(
        isArabic
          ? "أدخل خط العرض وخط الطول معًا، أو اتركهما فارغين."
          : "Enter both latitude and longitude, or leave both empty."
      );
      return;
    }

    let latitudeNumber: number | null = null;
    let longitudeNumber: number | null = null;

    if (hasLatitude && hasLongitude) {
      latitudeNumber = Number(latitude);
      longitudeNumber = Number(longitude);

      if (
        !Number.isFinite(latitudeNumber) ||
        latitudeNumber < -90 ||
        latitudeNumber > 90
      ) {
        setError(
          isArabic
            ? "خط العرض يجب أن يكون بين -90 و90."
            : "Latitude must be between -90 and 90."
        );
        return;
      }

      if (
        !Number.isFinite(longitudeNumber) ||
        longitudeNumber < -180 ||
        longitudeNumber > 180
      ) {
        setError(
          isArabic
            ? "خط الطول يجب أن يكون بين -180 و180."
            : "Longitude must be between -180 and 180."
        );
        return;
      }
    }

    const farmData: CreateFarmData = {
      name: name.trim(),
      location: location.trim(),
      area_hectares: areaNumber,
      soil_type: soilType,
      current_crop: currentCrop.trim(),
      latitude: latitudeNumber,
      longitude: longitudeNumber,
    };

    try {
      await onSubmit(farmData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isArabic
            ? "حدث خطأ أثناء حفظ المزرعة."
            : "An error occurred while saving the farm."
      );
    }
  };

  return (
    <div
      className="farm-modal-overlay"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !isSaving
        ) {
          onClose();
        }
      }}
    >
      <section
        className="farm-modal"
        dir={isArabic ? "rtl" : "ltr"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="farm-modal-title"
      >
        {/* Header */}
        <div className="farm-modal-header">
          <div>
            <span className="farm-modal-eyebrow">
              {isArabic ? "إدارة المزارع" : "FARM MANAGEMENT"}
            </span>

            <h2 id="farm-modal-title">
              {isArabic ? "إضافة مزرعة جديدة" : "Add a New Farm"}
            </h2>

            <p>
              {isArabic
                ? "أدخل بيانات مزرعتك لتجهيز التحليل الزراعي والمناخي."
                : "Enter your farm details to prepare agricultural and climate analysis."}
            </p>
          </div>

          <button
            className="farm-modal-close"
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label={isArabic ? "إغلاق" : "Close"}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form className="farm-form" onSubmit={handleSubmit}>
          {/* Farm Name */}
          <div className="farm-form-field">
            <label htmlFor="farm-name">
              {isArabic ? "اسم المزرعة" : "Farm Name"}
            </label>

            <input
              id="farm-name"
              type="text"
              placeholder={
                isArabic ? "مثال: مزرعة النخيل" : "e.g. Palm Farm"
              }
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              minLength={2}
              required
              disabled={isSaving}
            />
          </div>

          {/* Location */}
          <div className="farm-form-field">
            <label htmlFor="farm-location">
              {isArabic ? "الموقع" : "Location"}
            </label>

            <input
              id="farm-location"
              type="text"
              placeholder={
                isArabic
                  ? "المدينة أو القرية أو المنطقة"
                  : "City, village, or area"
              }
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              maxLength={200}
              minLength={2}
              required
              disabled={isSaving}
            />
          </div>

          {/* Area */}
          <div className="farm-form-field">
            <label htmlFor="farm-area">
              {isArabic ? "المساحة بالهكتار" : "Area (hectares)"}
            </label>

            <input
              id="farm-area"
              type="number"
              min="0.01"
              max="1000000"
              step="any"
              placeholder={isArabic ? "مثال: 2.5" : "e.g. 2.5"}
              value={area}
              onChange={(event) => setArea(event.target.value)}
              required
              disabled={isSaving}
            />
          </div>

          {/* Soil Type */}
          <div className="farm-form-field">
            <label htmlFor="farm-soil">
              {isArabic ? "نوع التربة" : "Soil Type"}
            </label>

            <select
              id="farm-soil"
              value={soilType}
              onChange={(event) =>
                setSoilType(
                  event.target.value as CreateFarmData["soil_type"]
                )
              }
              disabled={isSaving}
            >
              <option value="clay">
                {isArabic ? "طينية" : "Clay"}
              </option>

              <option value="sandy">
                {isArabic ? "رملية" : "Sandy"}
              </option>

              <option value="loamy">
                {isArabic ? "طميية" : "Loamy"}
              </option>

              <option value="silty">
                {isArabic ? "غرينية" : "Silty"}
              </option>

              <option value="other">
                {isArabic ? "أخرى" : "Other"}
              </option>
            </select>
          </div>

          {/* Current Crop */}
          <div className="farm-form-field">
            <label htmlFor="farm-crop">
              {isArabic ? "المحصول الحالي" : "Current Crop"}
            </label>

            <input
              id="farm-crop"
              type="text"
              placeholder={
                isArabic
                  ? "مثال: القمح أو الذرة"
                  : "e.g. Wheat or corn"
              }
              value={currentCrop}
              onChange={(event) => setCurrentCrop(event.target.value)}
              maxLength={100}
              minLength={1}
              required
              disabled={isSaving}
            />
          </div>

          {/* Coordinates */}
          <div className="farm-form-section">
            <h3>
              {isArabic
                ? "📍 الإحداثيات الجغرافية"
                : "📍 Geographic Coordinates"}
            </h3>

            <p>
              {isArabic
                ? "حدد موقع مزرعتك على الخريطة أو أدخل الإحداثيات يدويًا."
                : "Select your farm location on the map or enter coordinates manually."}
            </p>
          </div>

          {/* Map Picker Button */}
          <div className="farm-form-field">
            <button
              type="button"
              onClick={openMapPicker}
              disabled={isSaving}
              style={{
                width: "100%",
                padding: "13px 16px",
                border: "none",
                borderRadius: "10px",
                background: "#238b57",
                color: "#fff",
                fontWeight: 700,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              📍{" "}
              {isArabic
                ? "اختيار موقع المزرعة من الخريطة"
                : "Choose Farm Location on Map"}
            </button>
          </div>

          {/* Map Picker */}
          {showMapPicker && (
            <div
              style={{
                display: "grid",
                gap: "12px",
                padding: "14px",
                borderRadius: "12px",
                border: "1px solid #dce8df",
                background: "var(--card-bg, #f8fbf8)",
              }}
            >
              <div>
                <strong>
                  {isArabic
                    ? "حدد موقع المزرعة"
                    : "Select Farm Location"}
                </strong>

                <p style={{ margin: "6px 0 0", fontSize: "13px" }}>
                  {isArabic
                    ? "اضغط على الخريطة لوضع العلامة، ثم اسحبها لتعديل الموقع."
                    : "Click the map to place the marker, then drag it to adjust the location."}
                </p>
              </div>

              {!apiKey ? (
                <div className="farm-form-error">
                  {isArabic
                    ? "مفتاح Google Maps API غير موجود. تحقق من إعداد VITE_GOOGLE_MAPS_API_KEY."
                    : "Google Maps API key is missing. Check VITE_GOOGLE_MAPS_API_KEY."}
                </div>
              ) : loadError ? (
                <div className="farm-form-error">
                  {isArabic
                    ? "تعذر تحميل الخريطة. تحقق من مفتاح Google Maps وإعداداته."
                    : "Could not load Google Maps. Check your API key and settings."}
                </div>
              ) : !isLoaded ? (
                <div style={{ padding: "35px", textAlign: "center" }}>
                  {isArabic
                    ? "جاري تحميل الخريطة..."
                    : "Loading map..."}
                </div>
              ) : (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={selectedPosition ?? defaultCenter}
                  zoom={selectedPosition ? 17 : 12}
                  options={mapOptions}
                  onClick={handleMapClick}
                >
                  {selectedPosition && (
                    <MarkerF
                      position={selectedPosition}
                      draggable
                      onDragEnd={handleMarkerDrag}
                      title={
                        isArabic
                          ? "اسحب العلامة لتحديد موقع المزرعة"
                          : "Drag to select farm location"
                      }
                    />
                  )}
                </GoogleMap>
              )}

              {selectedPosition && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    fontSize: "13px",
                  }}
                >
                  <div>
                    <strong>
                      {isArabic ? "خط العرض" : "Latitude"}
                    </strong>
                    <div>{selectedPosition.lat.toFixed(7)}</div>
                  </div>

                  <div>
                    <strong>
                      {isArabic ? "خط الطول" : "Longitude"}
                    </strong>
                    <div>{selectedPosition.lng.toFixed(7)}</div>
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={confirmMapLocation}
                  disabled={!isLoaded || !selectedPosition || isSaving}
                  style={{
                    flex: 1,
                    minWidth: "120px",
                    padding: "11px",
                    border: "none",
                    borderRadius: "9px",
                    background: "#238b57",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer",
                    opacity: !isLoaded || !selectedPosition ? 0.5 : 1,
                  }}
                >
                  {isArabic ? "تأكيد الموقع" : "Confirm Location"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowMapPicker(false)}
                  disabled={isSaving}
                  style={{
                    flex: 1,
                    minWidth: "100px",
                    padding: "11px",
                    border: "1px solid #cbd5ce",
                    borderRadius: "9px",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                >
                  {isArabic ? "إغلاق الخريطة" : "Close Map"}
                </button>
              </div>
            </div>
          )}

          {/* Latitude */}
          <div className="farm-form-field">
            <label htmlFor="farm-latitude">
              {isArabic ? "خط العرض (Latitude)" : "Latitude"}
            </label>

            <input
              id="farm-latitude"
              type="number"
              min="-90"
              max="90"
              step="any"
              placeholder={isArabic ? "مثال: 31.4" : "e.g. 31.4"}
              value={latitude}
              onChange={(event) => {
                setLatitude(event.target.value);
                setConfirmedPosition(null);
              }}
              disabled={isSaving}
            />
          </div>

          {/* Longitude */}
          <div className="farm-form-field">
            <label htmlFor="farm-longitude">
              {isArabic ? "خط الطول (Longitude)" : "Longitude"}
            </label>

            <input
              id="farm-longitude"
              type="number"
              min="-180"
              max="180"
              step="any"
              placeholder={isArabic ? "مثال: 31.8" : "e.g. 31.8"}
              value={longitude}
              onChange={(event) => {
                setLongitude(event.target.value);
                setConfirmedPosition(null);
              }}
              disabled={isSaving}
            />
          </div>

          {confirmedPosition && (
            <p style={{ color: "#238b57", fontSize: "13px" }}>
              ✓{" "}
              {isArabic
                ? "تم تحديد موقع المزرعة بنجاح."
                : "Farm location selected successfully."}
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="farm-form-error" role="alert">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="farm-form-actions">
            <button
              className="farm-submit-button"
              type="submit"
              disabled={isSaving || showMapPicker}
            >
              {isSaving
                ? isArabic
                  ? "جاري الحفظ..."
                  : "Saving..."
                : isArabic
                  ? "حفظ المزرعة"
                  : "Save Farm"}
            </button>

            <button
              className="farm-cancel-button"
              type="button"
              onClick={onClose}
              disabled={isSaving}
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
