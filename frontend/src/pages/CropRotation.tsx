
import { useCallback, useEffect, useMemo, useState } from "react";
import { getFarms, type Farm } from "../services/farms";
import "./CropRotation.css";

type Language = "ar" | "en";
type Season = "winter" | "summer" | "nile";

type Recommendation = {
  crop: string;
  reason: string;
  factors: string[];
  confidence: string;
};

type Plan = {
  id: number;
  farm_id: number;
  title: string;
  current_crop: string;
  recommended_crops: string[];
  soil_type: Farm["soil_type"];
  season: Season;
  area_hectares: number;
  notes: string;
  status: "draft" | "active" | "completed";
  created_at: string;
  updated_at: string;
};

type WeatherResponse = {
  farm_id?: number;
  data_available?: boolean;
  coordinates?: { latitude: number; longitude: number };
  start_date?: string;
  end_date?: string;
  weather?: Record<string, Record<string, number>>;
  source?: string;
  updated_at?: string;
  message?: string;
};

type SoilLayer = {
  name?: string;
  unit_measure?: { mapped_units?: string; target_units?: string };
  depths?: Array<{
    label?: string;
    values?: Record<string, number | null>;
  }>;
};

type SoilResponse = {
  farm_id?: number;
  data_available?: boolean;
  soil?: {
    properties?: {
      layers?: SoilLayer[];
    };
  };
  source?: string;
  updated_at?: string;
  message?: string;
};

type Props = {
  language?: Language;
  onBack?: () => void;
};

const API = "http://terra-shift-ai.vercel.app";


const seasons: { value: Season; en: string; ar: string }[] = [
  { value: "winter", en: "Winter", ar: "الشتاء" },
  { value: "summer", en: "Summer", ar: "الصيف" },
  { value: "nile", en: "Nile season", ar: "العروة النيلية" },
];

const crops: Record<string, { en: string; ar: string; category: string }> = {
  wheat: { en: "Wheat", ar: "القمح", category: "Cereal" },
  corn: { en: "Corn", ar: "الذرة", category: "Cereal" },
  maize: { en: "Maize", ar: "الذرة", category: "Cereal" },
  rice: { en: "Rice", ar: "الأرز", category: "Cereal" },
  barley: { en: "Barley", ar: "الشعير", category: "Cereal" },
  cotton: { en: "Cotton", ar: "القطن", category: "Crop" },
  tomato: { en: "Tomato", ar: "الطماطم", category: "Vegetable" },
  tomatoes: { en: "Tomatoes", ar: "الطماطم", category: "Vegetable" },
  potato: { en: "Potato", ar: "البطاطس", category: "Vegetable" },
  potatoes: { en: "Potatoes", ar: "البطاطس", category: "Vegetable" },
  onions: { en: "Onions", ar: "البصل", category: "Vegetable" },
  beans: { en: "Beans", ar: "الفاصوليا", category: "Legume" },
  fava_beans: { en: "Fava beans", ar: "الفول البلدي", category: "Legume" },
  lentils: { en: "Lentils", ar: "العدس", category: "Legume" },
  chickpeas: { en: "Chickpeas", ar: "الحمص", category: "Legume" },
  clover: { en: "Clover", ar: "البرسيم", category: "Legume" },
  soybeans: { en: "Soybeans", ar: "فول الصويا", category: "Legume" },
  soybean: { en: "Soybean", ar: "فول الصويا", category: "Legume" },
  sorghum: { en: "Sorghum", ar: "الذرة الرفيعة", category: "Cereal" },
  peanuts: { en: "Peanuts", ar: "الفول السوداني", category: "Legume" },
};

const text = {
  en: {
    eyebrow: "SMART AGRICULTURE • TERRASHIFT AI",
    title: "Smart Crop Rotation",
    subtitle: "Discover crops that may suit your farm and plan for the next growing season.",
    back: "Back",
    farms: "Select farm",
    farmHint: "Choose a farm to plan for.",
    loading: "Loading...",
    loadError: "Could not load farms. Check the backend.",
    retry: "Try again",
    noFarms: "No farms registered",
    addFarm: "Add a farm from Farm Explorer first.",
    area: "Area",
    soil: "Soil type",
    currentCrop: "Current crop",
    location: "Location",
    weather: "Historical weather",
    weatherHint: "Weather data is retrieved from NASA POWER for the selected farm.",
    temperature: "Mean temperature",
    rain: "Precipitation",
    humidity: "Humidity",
    weatherLoading: "Loading weather...",
    weatherUnavailable: "Weather data is not available yet.",
    refreshWeather: "Refresh environment",
    refreshing: "Fetching data...",
    lastUpdated: "Last updated",
    weatherConnected: "Environmental data available",
    weatherDisconnected: "No environmental data",
    coordinatesMissing: "Add latitude and longitude to this farm first.",
    soilTitle: "Soil properties",
    soilHint: "Soil properties retrieved from ISRIC SoilGrids.",
    soilUnavailable: "Soil data is not available yet.",
    ph: "Soil pH",
    clay: "Clay",
    sand: "Sand",
    carbon: "Organic carbon",
    recommendations: "Recommended crops",
    recommendationHint: "Rule-based estimates using your farm and selected season.",
    season: "Target season",
    loadingRecommendations: "Getting recommendations...",
    noRecommendations: "No recommendations available.",
    reason: "Why recommended",
    factors: "Factors",
    chooseCrop: "Select crop",
    selected: "Selected",
    savePlan: "Save plan",
    saving: "Saving...",
    savedPlans: "Saved plans",
    noPlans: "No plans saved for this farm yet.",
    delete: "Delete",
    saved: "Plan saved to the database.",
    deleted: "Plan deleted.",
    chooseFarmError: "Select a farm first.",
    chooseCropError: "Select a recommended crop first.",
    requestError: "Request failed. Check the backend and try again.",
    confidence: "Rule-based",
    disclaimer: "Preliminary recommendations only; not a substitute for soil testing or local agricultural advice.",
    dataDate: "Period",
    source: "Source",
    refreshSuccess: "Environmental data updated successfully.",
    refreshError: "Could not update environmental data.",
    refreshDates: "The system requests the last 30 days, ending 7 days ago.",
  },
  ar: {
    eyebrow: "الزراعة الذكية • TERRASHIFT AI",
    title: "الدورة الزراعية الذكية",
    subtitle: "اكتشف المحاصيل المناسبة لمزرعتك وخطط للموسم الزراعي القادم.",
    back: "رجوع",
    farms: "اختر المزرعة",
    farmHint: "اختر المزرعة التي تريد إعداد خطة لها.",
    loading: "جاري التحميل...",
    loadError: "تعذر تحميل المزارع. تأكد من تشغيل الـ Backend.",
    retry: "إعادة المحاولة",
    noFarms: "لا توجد مزارع مسجلة",
    addFarm: "أضف مزرعة أولًا من صفحة استكشاف المزارع.",
    area: "المساحة",
    soil: "نوع التربة",
    currentCrop: "المحصول الحالي",
    location: "الموقع",
    weather: "بيانات الطقس التاريخية",
    weatherHint: "يتم جلب بيانات الطقس من NASA POWER حسب إحداثيات المزرعة.",
    temperature: "متوسط الحرارة",
    rain: "الأمطار",
    humidity: "الرطوبة",
    weatherLoading: "جاري تحميل الطقس...",
    weatherUnavailable: "بيانات الطقس غير متاحة حتى الآن.",
    refreshWeather: "تحديث بيانات البيئة",
    refreshing: "جاري جلب البيانات...",
    lastUpdated: "آخر تحديث",
    weatherConnected: "البيانات البيئية متاحة",
    weatherDisconnected: "لا توجد بيانات بيئية",
    coordinatesMissing: "أضف خط العرض وخط الطول للمزرعة أولًا.",
    soilTitle: "خصائص التربة",
    soilHint: "خصائص التربة مصدرها ISRIC SoilGrids.",
    soilUnavailable: "بيانات التربة غير متاحة حتى الآن.",
    ph: "درجة حموضة التربة",
    clay: "الطين",
    sand: "الرمل",
    carbon: "الكربون العضوي",
    recommendations: "المحاصيل المقترحة",
    recommendationHint: "توصيات تقديرية مبنية على قواعد وبيانات المزرعة والموسم.",
    season: "الموسم المستهدف",
    loadingRecommendations: "جاري جلب التوصيات...",
    noRecommendations: "لا توجد توصيات متاحة.",
    reason: "سبب الترشيح",
    factors: "العوامل",
    chooseCrop: "اختيار المحصول",
    selected: "تم الاختيار",
    savePlan: "حفظ الخطة",
    saving: "جاري الحفظ...",
    savedPlans: "الخطط المحفوظة",
    noPlans: "لا توجد خطط محفوظة لهذه المزرعة حتى الآن.",
    delete: "حذف",
    saved: "تم حفظ الخطة في قاعدة البيانات.",
    deleted: "تم حذف الخطة.",
    chooseFarmError: "اختر مزرعة أولًا.",
    chooseCropError: "اختر محصولًا من التوصيات أولًا.",
    requestError: "فشل الطلب. تأكد من الـ Backend وحاول مرة أخرى.",
    confidence: "توصية مبنية على قواعد",
    disclaimer: "هذه توصيات أولية وليست بديلًا عن تحليل التربة أو الإرشاد الزراعي المحلي.",
    dataDate: "الفترة",
    source: "المصدر",
    refreshSuccess: "تم تحديث بيانات البيئة بنجاح.",
    refreshError: "تعذر تحديث البيانات البيئية.",
    refreshDates: "يطلب النظام آخر 30 يومًا تنتهي قبل 7 أيام.",
  },
} as const;

function cropName(value: string, lang: Language) {
  const key = value.toLowerCase().trim().replaceAll(" ", "_");
  return crops[key]?.[lang] ?? value.replaceAll("_", " ");
}

function soilName(value: string, lang: Language) {
  const map: Record<string, { en: string; ar: string }> = {
    clay: { en: "Clay", ar: "طينية" },
    sandy: { en: "Sandy", ar: "رملية" },
    loamy: { en: "Loamy", ar: "طميية" },
    silty: { en: "Silty", ar: "غرينية" },
    other: { en: "Other", ar: "أخرى" },
  };
  return map[value]?.[lang] ?? value;
}

function formatDate(value?: string, lang: Language = "en") {
  if (!value) return "—";
  const match = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US");
}

function latestValidValue(
  series?: Record<string, number>,
): { date: string; value: number } | null {
  if (!series) return null;

  const valid = Object.entries(series)
    .filter(([, value]) => typeof value === "number" && Number.isFinite(value) && value > -900)
    .sort(([a], [b]) => b.localeCompare(a));

  if (!valid.length) return null;

  return { date: valid[0][0], value: valid[0][1] };
}

function findSoilValue(
  layers: SoilLayer[] | undefined,
  property: string,
): { value: number; unit: string } | null {
  if (!layers) return null;

  const layer = layers.find(
    (item) => item.name?.toLowerCase() === property.toLowerCase(),
  );
  const depth = layer?.depths?.find((item) => item.label === "0-5cm")
    ?? layer?.depths?.[0];

  if (!depth?.values) return null;

  const value = depth.values.mean ?? depth.values["Q0.5"];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  const unit = layer?.unit_measure?.target_units
    ?? layer?.unit_measure?.mapped_units
    ?? "";

  return { value, unit };
}

function soilDisplay(
  result: { value: number; unit: string } | null,
  property: string,
) {
  if (!result) return "—";

  // SoilGrids commonly reports pH and soil fractions as scaled values.
  if (property === "phh2o") {
    return (result.value / 10).toFixed(1);
  }

  if (["clay", "sand"].includes(property)) {
    return `${(result.value / 10).toFixed(1)}%`;
  }

  if (property === "soc") {
    return `${(result.value / 10).toFixed(1)} g/kg`;
  }

  return `${result.value} ${result.unit}`.trim();
}

function formatUpdatedAt(value: string | undefined, language: Language) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(language === "ar" ? "ar-EG" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function CropRotation({
  language = "ar",
  onBack,
}: Props) {
  const t = text[language];

  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmId, setFarmId] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [season, setSeason] = useState<Season>("winter");

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState("");

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [soil, setSoil] = useState<SoilResponse | null>(null);
  const [environmentLoading, setEnvironmentLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [environmentError, setEnvironmentError] = useState("");
  const [environmentRefreshKey, setEnvironmentRefreshKey] = useState(0);

  const farm = useMemo(
    () => farms.find((item) => item.id === farmId) ?? null,
    [farms, farmId],
  );

  const request = useCallback(async <T,>(
    path: string,
    init?: RequestInit,
  ): Promise<T> => {
    const response = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      let detail = "";
      try {
        const body = await response.json();
        detail =
          typeof body.detail === "string"
            ? body.detail
            : Array.isArray(body.detail)
              ? body.detail.map((item: { msg?: string }) => item.msg).join(", ")
              : "";
      } catch {
        // The response might not contain JSON.
      }
      throw new Error(detail || `HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  }, []);

  const loadFarms = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getFarms();
      setFarms(data);
      setFarmId((current) =>
        current !== "" && data.some((item) => item.id === current)
          ? current
          : (data[0]?.id ?? ""),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  useEffect(() => {
    void loadFarms();
  }, [loadFarms]);

  const loadPlans = useCallback(
    async (id: number) => {
      setLoadingPlans(true);
      try {
        const data = await request<Plan[]>(`/api/plans?farm_id=${id}`);
        setPlans(Array.isArray(data) ? data : []);
      } catch (err) {
        setPlans([]);
        setNotice(err instanceof Error ? err.message : t.requestError);
      } finally {
        setLoadingPlans(false);
      }
    },
    [request, t.requestError],
  );

  useEffect(() => {
    setRecommendations([]);
    setSelectedCrop("");
    setWeather(null);
    setSoil(null);
    setEnvironmentError("");

    if (farmId === "") {
      setPlans([]);
      return;
    }

    void loadPlans(farmId);
  }, [farmId, loadPlans]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendations() {
      if (farmId === "") {
        setRecommendations([]);
        return;
      }

      setLoadingRecs(true);
      setError("");

      try {
        const data = await request<Recommendation[]>(
          "/api/crop-rotation/recommendations",
          {
            method: "POST",
            body: JSON.stringify({ farm_id: farmId, season }),
          },
        );

        if (!cancelled) {
          setRecommendations(Array.isArray(data) ? data : []);
          setSelectedCrop("");
        }
      } catch (err) {
        if (!cancelled) {
          setRecommendations([]);
          setError(err instanceof Error ? err.message : t.requestError);
        }
      } finally {
        if (!cancelled) setLoadingRecs(false);
      }
    }

    void loadRecommendations();
    return () => {
      cancelled = true;
    };
  }, [farmId, season, request, t.requestError]);

  const loadEnvironment = useCallback(async (id: number) => {
    setEnvironmentLoading(true);
    setEnvironmentError("");

    try {
      const [weatherResult, soilResult] = await Promise.all([
        request<WeatherResponse>(`/api/farms/${id}/environment/weather`),
        request<SoilResponse>(`/api/farms/${id}/environment/soil`),
      ]);

      setWeather(weatherResult);
      setSoil(soilResult);
    } catch (err) {
      setEnvironmentError(
        err instanceof Error ? err.message : t.weatherUnavailable,
      );
      setWeather(null);
      setSoil(null);
    } finally {
      setEnvironmentLoading(false);
    }
  }, [request, t.weatherUnavailable]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setWeather(null);
      setSoil(null);
      setEnvironmentError("");

      if (farmId === "") {
        setEnvironmentLoading(false);
        return;
      }

      setEnvironmentLoading(true);

      try {
        const [weatherResult, soilResult] = await Promise.all([
          request<WeatherResponse>(`/api/farms/${farmId}/environment/weather`),
          request<SoilResponse>(`/api/farms/${farmId}/environment/soil`),
        ]);

        if (!cancelled) {
          setWeather(weatherResult);
          setSoil(soilResult);
        }
      } catch (err) {
        if (!cancelled) {
          setEnvironmentError(
            err instanceof Error ? err.message : t.weatherUnavailable,
          );
          setWeather(null);
          setSoil(null);
        }
      } finally {
        if (!cancelled) setEnvironmentLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [farmId, environmentRefreshKey, request, t.weatherUnavailable]);

  async function refreshEnvironment() {
    if (!farm) {
      setNotice(t.chooseFarmError);
      return;
    }

    if (farm.latitude == null || farm.longitude == null) {
      setEnvironmentError(t.coordinatesMissing);
      return;
    }

    setRefreshing(true);
    setEnvironmentError("");
    setNotice("");

    // NASA POWER data can have a publication delay. Request a recent
    // historical window rather than assuming today's measurements exist.
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 7);

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 29);

    const toApiDate = (date: Date) =>
      `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;

    try {
      await request<unknown>(
        `/api/farms/${farm.id}/environment/refresh?start=${toApiDate(startDate)}&end=${toApiDate(endDate)}`,
        { method: "POST" },
      );

      setNotice(t.refreshSuccess);
      setEnvironmentRefreshKey((value) => value + 1);
    } catch (err) {
      setEnvironmentError(
        err instanceof Error ? err.message : t.refreshError,
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function savePlan() {
    setNotice("");

    if (!farm) {
      setNotice(t.chooseFarmError);
      return;
    }

    if (!selectedCrop) {
      setNotice(t.chooseCropError);
      return;
    }

    setSaving(true);

    try {
      const recommendation = recommendations.find(
        (item) => item.crop === selectedCrop,
      );

      await request<Plan>("/api/plans", {
        method: "POST",
        body: JSON.stringify({
          farm_id: farm.id,
          title: `${cropName(selectedCrop, "en")} - ${season}`,
          current_crop: farm.current_crop || "unknown",
          recommended_crops: [selectedCrop],
          soil_type: farm.soil_type,
          season,
          area_hectares: farm.area_hectares,
          notes: recommendation?.reason ?? "",
          status: "draft",
        }),
      });

      await loadPlans(farm.id);
      setSelectedCrop("");
      setNotice(t.saved);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t.requestError);
    } finally {
      setSaving(false);
    }
  }

  async function deletePlan(id: number) {
    const confirmed = window.confirm(
      language === "ar" ? "هل تريد حذف هذه الخطة؟" : "Delete this plan?",
    );

    if (!confirmed) return;

    setDeleting(id);
    setNotice("");

    try {
      await request<unknown>(`/api/plans/${id}`, { method: "DELETE" });
      setPlans((old) => old.filter((plan) => plan.id !== id));
      setNotice(t.deleted);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t.requestError);
    } finally {
      setDeleting(null);
    }
  }

  const weatherSeries = weather?.weather;
  const temperature = latestValidValue(weatherSeries?.T2M);
  const rainfall = latestValidValue(weatherSeries?.PRECTOTCORR);
  const humidity = latestValidValue(weatherSeries?.RH2M);

  const soilLayers = soil?.soil?.properties?.layers;
  const soilPh = findSoilValue(soilLayers, "phh2o");
  const soilClay = findSoilValue(soilLayers, "clay");
  const soilSand = findSoilValue(soilLayers, "sand");
  const soilCarbon = findSoilValue(soilLayers, "soc");

  const hasEnvironment =
    weather?.data_available !== false &&
    Boolean(weather?.weather || soil?.soil);

  return (
    <main
      className="crop-rotation-page"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <div className="cr-container">
        <header className="cr-hero">
          <div className="cr-hero-copy">
            <span className="cr-eyebrow">
              <span className="cr-eyebrow-dot" />
              {t.eyebrow}
            </span>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
            {onBack && (
              <button
                className="cr-back-button"
                type="button"
                onClick={onBack}
              >
                ← {t.back}
              </button>
            )}
          </div>
          <div className="cr-hero-mark" aria-hidden="true">
            <span className="cr-hero-orbit cr-orbit-one" />
            <span className="cr-hero-orbit cr-orbit-two" />
            <span className="cr-hero-leaf">🌱</span>
            <span className="cr-hero-caption">GROW SMARTER</span>
          </div>
        </header>

        {notice && (
          <div className="cr-notice" role="status">
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="cr-alert" role="alert">
            <span>!</span>
            <p>{error}</p>
            <button type="button" onClick={() => void loadFarms()}>
              {t.retry}
            </button>
          </div>
        )}

        {loading ? (
          <section className="cr-state">
            <span className="cr-spinner" />
            <p>{t.loading}</p>
          </section>
        ) : farms.length === 0 ? (
          <section className="cr-state">
            <span className="cr-empty-icon">🌱</span>
            <h2>{t.noFarms}</h2>
            <p>{t.addFarm}</p>
          </section>
        ) : (
          <>
            <section className="cr-selector-card">
              <span className="cr-selector-icon">🧑‍🌾</span>
              <div className="cr-selector-copy">
                <label htmlFor="cr-farm">{t.farms}</label>
                <span>{t.farmHint}</span>
              </div>
              <select
                id="cr-farm"
                value={farmId}
                onChange={(event) => setFarmId(Number(event.target.value))}
              >
                {farms.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {item.location}
                  </option>
                ))}
              </select>
            </section>

            {farm && (
              <section className="cr-section">
                <div className="cr-section-heading">
                  <div>
                    <span className="cr-section-kicker">FARM PROFILE</span>
                    <h2>
                      {language === "ar" ? "بيانات المزرعة" : "Farm overview"}
                    </h2>
                  </div>
                  <span className="cr-section-tag">{farm.name}</span>
                </div>

                <div className="cr-overview-grid">
                  <article className="cr-info-card">
                    <span className="cr-card-icon cr-green-icon">📍</span>
                    <div className="cr-card-label">{t.location}</div>
                    <h3>{farm.location}</h3>
                    <div className="cr-card-divider" />
                    <div className="cr-profile-bottom">
                      <div>
                        <span>{t.area}</span>
                        <strong>
                          {farm.area_hectares} <small>ha</small>
                        </strong>
                      </div>
                      <div>
                        <span>{t.soil}</span>
                        <strong>{soilName(farm.soil_type, language)}</strong>
                      </div>
                    </div>
                  </article>

                  <article className="cr-info-card">
                    <span className="cr-card-icon cr-orange-icon">🌾</span>
                    <div className="cr-card-label">{t.currentCrop}</div>
                    <h3>{cropName(farm.current_crop || "—", language)}</h3>
                    <div className="cr-card-divider" />
                    <div className="cr-profile-bottom">
                      <div>
                        <span>{t.farms}</span>
                        <strong>#{farm.id}</strong>
                      </div>
                      <div>
                        <span>{t.soil}</span>
                        <strong>{soilName(farm.soil_type, language)}</strong>
                      </div>
                    </div>
                  </article>

                  <article className="cr-info-card cr-climate-card">
                    <div className="cr-climate-heading">
                      <span className="cr-card-icon cr-blue-icon">🌤️</span>
                      <div>
                        <div className="cr-card-label">{t.weather}</div>
                        <h3>
                          {language === "ar"
                            ? "ملخص الطقس المسجل"
                            : "Recorded weather summary"}
                        </h3>
                      </div>
                    </div>

                    <p className="cr-card-description">{t.weatherHint}</p>

                    <div className="cr-weather-status-row">
                      <span
                        className={`cr-weather-status ${
                          hasEnvironment ? "is-connected" : "is-disconnected"
                        }`}
                      >
                        <i />
                        {hasEnvironment
                          ? t.weatherConnected
                          : t.weatherDisconnected}
                      </span>

                      <button
                        type="button"
                        className="cr-weather-refresh"
                        onClick={() => void refreshEnvironment()}
                        disabled={
                          refreshing ||
                          environmentLoading ||
                          farm.latitude == null ||
                          farm.longitude == null
                        }
                      >
                        {refreshing
                          ? t.refreshing
                          : `↻ ${t.refreshWeather}`}
                      </button>
                    </div>

                    {(farm.latitude == null || farm.longitude == null) && (
                      <p className="cr-muted-note">{t.coordinatesMissing}</p>
                    )}

                    {environmentLoading ? (
                      <div className="cr-weather-loading">
                        <span className="cr-mini-spinner" />
                      </div>
                    ) : temperature || rainfall || humidity ? (
                      <div className="cr-weather-grid">
                        <div>
                          <span>🌡️</span>
                          <small>{t.temperature}</small>
                          <strong>
                            {temperature
                              ? `${temperature.value.toFixed(1)}°C`
                              : "—"}
                          </strong>
                        </div>
                        <div>
                          <span>🌧️</span>
                          <small>{t.rain}</small>
                          <strong>
                            {rainfall
                              ? `${rainfall.value.toFixed(1)} mm`
                              : "—"}
                          </strong>
                        </div>
                        <div>
                          <span>💧</span>
                          <small>{t.humidity}</small>
                          <strong>
                            {humidity
                              ? `${humidity.value.toFixed(1)}%`
                              : "—"}
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <p className="cr-muted-note">
                        {t.weatherUnavailable}
                      </p>
                    )}

                    {weather?.start_date && weather?.end_date && (
                      <p className="cr-weather-updated">
                        {t.dataDate}: {formatDate(weather.start_date, language)}
                        {" — "}
                        {formatDate(weather.end_date, language)}
                      </p>
                    )}

                    {weather?.source && (
                      <p className="cr-weather-updated">
                        {t.source}: {weather.source}
                      </p>
                    )}

                    {weather?.updated_at && (
                      <p className="cr-weather-updated">
                        {t.lastUpdated}:{" "}
                        {formatUpdatedAt(weather.updated_at, language)}
                      </p>
                    )}
                  </article>
                </div>

                <div className="cr-section-heading" style={{ marginTop: 24 }}>
                  <div>
                    <span className="cr-section-kicker">SOIL INTELLIGENCE</span>
                    <h2>{t.soilTitle}</h2>
                    <p>{t.soilHint}</p>
                  </div>
                </div>

                {environmentLoading ? (
                  <div className="cr-state">
                    <span className="cr-mini-spinner" />
                    <p>{t.loading}</p>
                  </div>
                ) : soilLayers?.length ? (
                  <div className="cr-overview-grid">
                    {[
                      {
                        key: "phh2o",
                        title: t.ph,
                        value: soilDisplay(soilPh, "phh2o"),
                        icon: "🧪",
                      },
                      {
                        key: "clay",
                        title: t.clay,
                        value: soilDisplay(soilClay, "clay"),
                        icon: "🟤",
                      },
                      {
                        key: "sand",
                        title: t.sand,
                        value: soilDisplay(soilSand, "sand"),
                        icon: "🏜️",
                      },
                      {
                        key: "soc",
                        title: t.carbon,
                        value: soilDisplay(soilCarbon, "soc"),
                        icon: "🌿",
                      },
                    ].map((item) => (
                      <article className="cr-info-card" key={item.key}>
                        <span className="cr-card-icon cr-green-icon">
                          {item.icon}
                        </span>
                        <div className="cr-card-label">{item.title}</div>
                        <h3>{item.value}</h3>
                        <p className="cr-card-description">
                          {language === "ar"
                            ? "طبقة التربة السطحية"
                            : "Topsoil layer"}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="cr-history-empty">
                    <span className="cr-history-empty-icon">🌱</span>
                    <p>{t.soilUnavailable}</p>
                  </div>
                )}

                {environmentError && (
                  <div className="cr-alert" role="alert">
                    <span>!</span>
                    <p>{environmentError}</p>
                    <button
                      type="button"
                      onClick={() => void loadEnvironment(farm.id)}
                    >
                      {t.retry}
                    </button>
                  </div>
                )}
              </section>
            )}

            <section className="cr-section">
              <div className="cr-section-heading cr-recommendation-heading">
                <div>
                  <span className="cr-section-kicker">
                    DATA-DRIVEN SUGGESTIONS
                  </span>
                  <h2>{t.recommendations}</h2>
                  <p>{t.recommendationHint}</p>
                </div>
                <span className="cr-count-badge">
                  {recommendations.length}
                </span>
              </div>

              <div className="cr-selector-card">
                <span className="cr-selector-icon">🗓️</span>
                <div className="cr-selector-copy">
                  <label htmlFor="cr-season">{t.season}</label>
                  <span>
                    {language === "ar"
                      ? "اختيار الموسم المتاح في النظام"
                      : "Choose an available season"}
                  </span>
                </div>
                <select
                  id="cr-season"
                  value={season}
                  onChange={(event) =>
                    setSeason(event.target.value as Season)
                  }
                >
                  {seasons.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item[language]}
                    </option>
                  ))}
                </select>
              </div>

              {loadingRecs ? (
                <div className="cr-state">
                  <span className="cr-spinner" />
                  <p>{t.loadingRecommendations}</p>
                </div>
              ) : recommendations.length === 0 ? (
                <div className="cr-state">
                  <span className="cr-empty-icon">🌱</span>
                  <p>{t.noRecommendations}</p>
                </div>
              ) : (
                <div className="cr-recommendation-grid">
                  {recommendations.map((item, index) => {
                    const chosen = selectedCrop === item.crop;
                    const key = item.crop
                      .toLowerCase()
                      .trim()
                      .replaceAll(" ", "_");
                    const category = crops[key]?.category ?? "Crop";

                    return (
                      <article
                        key={`${item.crop}-${index}`}
                        className={`cr-recommendation-card${
                          chosen ? " cr-selected" : ""
                        }`}
                      >
                        <div className="cr-recommendation-top">
                          <div
                            className={`cr-crop-art cr-crop-art-${(index % 4) + 1}`}
                          >
                            {category === "Legume"
                              ? "🫘"
                              : category === "Vegetable"
                                ? "🥬"
                                : "🌾"}
                          </div>
                          <span className="cr-recommended-pill">
                            <span />
                            {t.confidence}
                          </span>
                        </div>

                        <div className="cr-recommendation-title-row">
                          <div>
                            <span className="cr-crop-family">
                              {category.toUpperCase()}
                            </span>
                            <h3>{cropName(item.crop, language)}</h3>
                          </div>
                        </div>

                        <div className="cr-reasons">
                          <h4>{t.reason}</h4>
                          <p>
                            <span>✓</span>
                            {item.reason}
                          </p>

                          {item.factors?.length > 0 && (
                            <>
                              <h4>{t.factors}</h4>
                              {item.factors.map((factor, factorIndex) => (
                                <p key={`${item.crop}-${factorIndex}`}>
                                  <span>✓</span>
                                  {factor}
                                </p>
                              ))}
                            </>
                          )}
                        </div>

                        <button
                          type="button"
                          className="cr-create-button"
                          onClick={() =>
                            setSelectedCrop(chosen ? "" : item.crop)
                          }
                        >
                          <span>{chosen ? t.selected : t.chooseCrop}</span>
                          <span>{chosen ? "✓" : "→"}</span>
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}

              {selectedCrop && farm && (
                <div className="cr-save-panel">
                  <div>
                    <span className="cr-section-kicker">
                      {language === "ar" ? "الخطة الجديدة" : "NEW PLAN"}
                    </span>
                    <h3>{cropName(selectedCrop, language)}</h3>
                    <p>
                      {farm.name} ·{" "}
                      {seasons.find((item) => item.value === season)?.[
                        language
                      ]}
                    </p>
                  </div>
                  <button
                    className="cr-save-button"
                    type="button"
                    disabled={saving}
                    onClick={() => void savePlan()}
                  >
                    {saving ? t.saving : t.savePlan}
                  </button>
                </div>
              )}
            </section>

            <section className="cr-section">
              <div className="cr-section-heading">
                <div>
                  <span className="cr-section-kicker">SAVED TO SQLITE</span>
                  <h2>{t.savedPlans}</h2>
                </div>
                <span className="cr-count-badge">{plans.length}</span>
              </div>

              {loadingPlans ? (
                <div className="cr-state">
                  <span className="cr-mini-spinner" />
                  <p>{t.loading}</p>
                </div>
              ) : plans.length === 0 ? (
                <div className="cr-history-empty">
                  <span className="cr-history-empty-icon">📋</span>
                  <p>{t.noPlans}</p>
                </div>
              ) : (
                <div className="cr-history-list">
                  {plans.map((plan) => (
                    <article className="cr-history-item" key={plan.id}>
                      <span className="cr-history-symbol">🌱</span>
                      <div className="cr-history-main">
                        <span>{plan.title}</span>
                        <h3>
                          {plan.recommended_crops
                            .map((crop) => cropName(crop, language))
                            .join(language === "ar" ? "، " : ", ")}
                        </h3>
                        <p>
                          {farm?.name ?? `#${plan.farm_id}`} ·{" "}
                          {seasons.find(
                            (item) => item.value === plan.season,
                          )?.[language] ?? plan.season}
                        </p>
                        <small>{plan.status}</small>
                      </div>
                      <div className="cr-history-date">
                        <small>
                          {formatDate(
                            plan.created_at,
                            language,
                          )}
                        </small>
                        <button
                          type="button"
                          className="cr-delete-button"
                          disabled={deleting === plan.id}
                          onClick={() => void deletePlan(plan.id)}
                          aria-label={t.delete}
                        >
                          {deleting === plan.id ? "…" : "×"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <footer className="cr-footer">
          <span>
            <i /> TERRASHIFT AI
          </span>
          <span>{t.disclaimer}</span>
        </footer>
      </div>
    </main>
  );
}
