import { useState, type FormEvent } from "react";

import type { CreateFarmData } from "../../services/farms";

import "./AddFarmModal.css";

type AddFarmModalProps = {
  language: "ar" | "en";
  onClose: () => void;
  onSubmit: (data: CreateFarmData) => Promise<void>;
  isSaving: boolean;
};

export default function AddFarmModal({
  language,
  onClose,
  onSubmit,
  isSaving,
}: AddFarmModalProps) {
  const isArabic = language === "ar";

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [area, setArea] = useState("");
  const [soilType, setSoilType] =
    useState<CreateFarmData["soil_type"]>("clay");
  const [currentCrop, setCurrentCrop] = useState("");

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [error, setError] = useState("");

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

          {/* Coordinates Heading */}
          <div className="farm-form-section">
            <h3>
              {isArabic
                ? "📍 الإحداثيات الجغرافية"
                : "📍 Geographic Coordinates"}
            </h3>

            <p>
              {isArabic
                ? "تساعد الإحداثيات على جلب بيانات الطقس للموقع الصحيح. يمكنك تركها فارغة وإضافتها لاحقًا."
                : "Coordinates help retrieve weather data for the correct location. You can leave them empty and add them later."}
            </p>
          </div>

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
              placeholder={
                isArabic ? "مثال: 31.4" : "e.g. 31.4"
              }
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
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
              placeholder={
                isArabic ? "مثال: 31.8" : "e.g. 31.8"
              }
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              disabled={isSaving}
            />
          </div>

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
              disabled={isSaving}
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