import { useEffect, useState } from "react";

import { getFarms } from "../../services/farms";
import type { Farm } from "../../services/farms";

type ClimateCardProps = {
  language: "ar" | "en";
  onCreatePlan: () => void;
};

type WeatherResponse = {
  current?: {
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    wind_speed_10m: number;
  };
  daily?: {
    precipitation_sum?: number[];
  };
};

type ClimateData = {
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  latitude: number;
  longitude: number;
};

export default function ClimateCard({
  language,
  onCreatePlan,
}: ClimateCardProps) {
  const isArabic = language === "ar";

  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [climate, setClimate] = useState<ClimateData | null>(null);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFarms() {
      try {
        setLoadingFarms(true);
        setError("");

        const data = await getFarms();

        if (cancelled) return;

        setFarms(data);

        const firstLocatedFarm = data.find(
          (farm) =>
            farm.latitude !== null &&
            farm.longitude !== null
        );

        if (firstLocatedFarm) {
          setSelectedFarmId(String(firstLocatedFarm.id));
        }
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : isArabic
              ? "تعذر تحميل المزارع."
              : "Could not load farms."
        );
      } finally {
        if (!cancelled) {
          setLoadingFarms(false);
        }
      }
    }

    void loadFarms();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedFarm = farms.find(
    (farm) => String(farm.id) === selectedFarmId
  );

  async function loadClimate() {
    if (!selectedFarm) {
      setError(
        isArabic
          ? "اختر مزرعة أولًا."
          : "Please select a farm first."
      );
      return;
    }

    if (
      selectedFarm.latitude === null ||
      selectedFarm.longitude === null
    ) {
      setClimate(null);

      setError(
        isArabic
          ? "المزرعة دي مفيش لها إحداثيات. افتح Farm Explorer واضغط تعديل البيانات لإضافة خط العرض وخط الطول."
          : "This farm has no coordinates. Open Farm Explorer, edit the farm, and add its latitude and longitude."
      );
      return;
    }

    setLoadingWeather(true);
    setError("");
    setClimate(null);

    try {
      const params = new URLSearchParams({
        latitude: String(selectedFarm.latitude),
        longitude: String(selectedFarm.longitude),
        current:
          "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
        daily: "precipitation_sum",
        timezone: "auto",
        forecast_days: "1",
      });

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Weather service request failed.");
      }

      const data = (await response.json()) as WeatherResponse;

      if (!data.current) {
        throw new Error("Weather data is unavailable.");
      }

      setClimate({
        temperature: data.current.temperature_2m,
        humidity: data.current.relative_humidity_2m,
        rainfall: data.daily?.precipitation_sum?.[0] ?? 0,
        windSpeed: data.current.wind_speed_10m,
        latitude: selectedFarm.latitude,
        longitude: selectedFarm.longitude,
      });
    } catch (err) {
      console.error("Failed to load climate data:", err);

      setError(
        isArabic
          ? "تعذر جلب بيانات الطقس. تحقق من الاتصال بالإنترنت وحاول مرة أخرى."
          : "Could not load weather data. Check your internet connection and try again."
      );
    } finally {
      setLoadingWeather(false);
    }
  }

  useEffect(() => {
    setClimate(null);
    setError("");
  }, [selectedFarmId]);

  return (
    <section className="climate-card">
      <div className="card-header">
        <div>
          <span className="card-eyebrow">
            {isArabic ? "تحليل المناخ" : "CLIMATE INTELLIGENCE"}
          </span>

          <h2>
            {isArabic ? "الظروف المناخية" : "Climate Conditions"}
          </h2>
        </div>

        <span className="climate-icon">☀</span>
      </div>

      <p className="card-description">
        {isArabic
          ? "اختر مزرعة لعرض بيانات الطقس حسب إحداثياتها المسجلة."
          : "Select a farm to view weather data for its saved coordinates."}
      </p>

      <div className="farm-form-field climate-farm-select">
        <label htmlFor="climate-farm-select">
          {isArabic ? "اختر المزرعة" : "Select Farm"}
        </label>

        <select
          id="climate-farm-select"
          value={selectedFarmId}
          onChange={(event) => setSelectedFarmId(event.target.value)}
          disabled={loadingFarms || farms.length === 0}
        >
          <option value="">
            {loadingFarms
              ? isArabic
                ? "جاري تحميل المزارع..."
                : "Loading farms..."
              : isArabic
                ? "اختر مزرعة"
                : "Choose a farm"}
          </option>

          {farms.map((farm) => (
            <option key={farm.id} value={farm.id}>
              {farm.name} — {farm.location}
              {farm.latitude === null || farm.longitude === null
                ? isArabic
                  ? " (بدون إحداثيات)"
                  : " (No coordinates)"
                : ""}
            </option>
          ))}
        </select>
      </div>

      {selectedFarm && (
        <div className="climate-note">
          <span className="connection-dot" />

          <span>
            {selectedFarm.latitude !== null &&
            selectedFarm.longitude !== null
              ? isArabic
                ? `الإحداثيات: ${selectedFarm.latitude}, ${selectedFarm.longitude}`
                : `Coordinates: ${selectedFarm.latitude}, ${selectedFarm.longitude}`
              : isArabic
                ? "أضف إحداثيات المزرعة أولًا."
                : "Add the farm coordinates first."}
          </span>
        </div>
      )}

      <button
        type="button"
        className="primary-button climate-button"
        onClick={() => void loadClimate()}
        disabled={
          loadingFarms ||
          loadingWeather ||
          !selectedFarm
        }
      >
        {loadingWeather
          ? isArabic
            ? "جاري تحميل الطقس..."
            : "Loading Weather..."
          : isArabic
            ? "تحليل الطقس"
            : "Analyze Weather"}
      </button>

      {error && (
        <p className="climate-error" role="alert">
          {error}
        </p>
      )}

      {climate && (
        <>
          <div className="climate-metrics">
            <div className="climate-metric">
              <span>{isArabic ? "درجة الحرارة" : "Temperature"}</span>
              <strong>{climate.temperature} °C</strong>
            </div>

            <div className="climate-metric">
              <span>{isArabic ? "أمطار اليوم" : "Rainfall Today"}</span>
              <strong>{climate.rainfall} mm</strong>
            </div>

            <div className="climate-metric">
              <span>{isArabic ? "رطوبة الهواء" : "Air Humidity"}</span>
              <strong>{climate.humidity} %</strong>
            </div>

            <div className="climate-metric">
              <span>{isArabic ? "سرعة الرياح" : "Wind Speed"}</span>
              <strong>{climate.windSpeed} km/h</strong>
            </div>
          </div>

          <div className="climate-note">
            <span className="connection-dot" />
            <span>
              {isArabic
                ? `بيانات الطقس للمزرعة: ${selectedFarm?.name}`
                : `Weather for farm: ${selectedFarm?.name}`}
            </span>
          </div>
        </>
      )}

      <p className="climate-data-source">
        {isArabic
          ? "المصدر: Open-Meteo. رطوبة الهواء تختلف عن رطوبة التربة."
          : "Source: Open-Meteo. Air humidity is different from soil moisture."}
      </p>

      <button
        type="button"
        className="secondary-button climate-button"
        onClick={onCreatePlan}
      >
        {isArabic ? "إنشاء خطة زراعية ←" : "Create Farm Plan →"}
      </button>
    </section>
  );
}