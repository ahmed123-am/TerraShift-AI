import { useState, type FormEvent } from "react";
import {
  createFarm,
  type CreateFarmData,
  type Farm,
} from "../../services/farms";

type FarmFormProps = {
  language: "ar" | "en";
  onSuccess: (farm: Farm) => void;
  onCancel: () => void;
};

export default function FarmForm({
  language,
  onSuccess,
  onCancel,
}: FarmFormProps) {
  const isArabic = language === "ar";

const [form, setForm] = useState<CreateFarmData>({
  name: "",
  location: "",
  area_hectares: 0,
  soil_type: "other",
  current_crop: "",
  latitude: null,
  longitude: null,
});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateField = <K extends keyof CreateFarmData>(
    key: K,
    value: CreateFarmData[K]
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const farm = await createFarm(form);
      onSuccess(farm);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isArabic
            ? "تعذرت إضافة المزرعة."
            : "Could not create the farm."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="farm-form-overlay">
      <form
        className="farm-form"
        onSubmit={handleSubmit}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="farm-form-header">
          <div>
            <span className="panel-kicker">
              {isArabic ? "مزرعتك الجديدة" : "YOUR NEW FARM"}
            </span>

            <h2>{isArabic ? "إضافة مزرعة" : "Add a Farm"}</h2>
          </div>

          <button
            type="button"
            className="farm-form-close"
            onClick={onCancel}
            aria-label={isArabic ? "إغلاق" : "Close"}
          >
            ×
          </button>
        </div>

        <label>
          {isArabic ? "اسم المزرعة" : "Farm Name"}

          <input
            required
            minLength={2}
            maxLength={100}
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder={isArabic ? "مثال: مزرعة القمح" : "e.g. Wheat Farm"}
          />
        </label>

        <label>
          {isArabic ? "الموقع" : "Location"}

          <input
            required
            minLength={2}
            maxLength={200}
            value={form.location}
            onChange={(event) => updateField("location", event.target.value)}
            placeholder={
              isArabic ? "المدينة والدولة" : "City and country"
            }
          />
        </label>

        <label>
          {isArabic ? "المساحة بالهكتار" : "Area in hectares"}

          <input
            type="number"
            required
            min="0.01"
            max="1000000"
            step="any"
            value={form.area_hectares}
            onChange={(event) =>
              updateField("area_hectares", Number(event.target.value))
            }
          />
        </label>

        <label>
          {isArabic ? "نوع التربة" : "Soil Type"}

          <select
            value={form.soil_type}
            onChange={(event) =>
              updateField(
                "soil_type",
                event.target.value as CreateFarmData["soil_type"]
              )
            }
          >
            <option value="other">{isArabic ? "أخرى" : "Other"}</option>
            <option value="clay">{isArabic ? "طينية" : "Clay"}</option>
            <option value="sandy">{isArabic ? "رملية" : "Sandy"}</option>
            <option value="loamy">{isArabic ? "طميية" : "Loamy"}</option>
            <option value="silty">{isArabic ? "غرينية" : "Silty"}</option>
          </select>
        </label>

        <label>
          {isArabic ? "المحصول الحالي" : "Current Crop"}

          <input
            required
            minLength={1}
            maxLength={100}
            value={form.current_crop}
            onChange={(event) =>
              updateField("current_crop", event.target.value)
            }
            placeholder={isArabic ? "مثال: القمح" : "e.g. Wheat"}
          />
        </label>

        {error && (
          <p className="farm-form-error" role="alert">
            {error}
          </p>
        )}

        <div className="farm-form-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
            disabled={loading}
          >
            {isArabic ? "إلغاء" : "Cancel"}
          </button>

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading
              ? isArabic
                ? "جارٍ الحفظ..."
                : "Saving..."
              : isArabic
                ? "حفظ المزرعة"
                : "Save Farm"}
          </button>
        </div>
      </form>
    </div>
  );
}