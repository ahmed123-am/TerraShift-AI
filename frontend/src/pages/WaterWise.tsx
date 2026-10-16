

import { useCallback, useEffect, useMemo, useState } from "react";

import { getFarms, type Farm } from "../services/farms";

import { apiRequest } from "../services/api";

import "./WaterWise.css";

type Language = "ar" | "en";

type WeatherData = {

  temperature: number;

  humidity: number;

  precipitation: number;

  dailyPrecipitation: number;

  et0: number;

  windSpeed: number | null;

  fetchedAt: Date;

};

type Props = {

  language: Language;

  onBack?: () => void;

};

type Estimate = {

  estimatedEt0: number;

  effectiveRain: number;

  netDepth: number;

  grossDepth: number;

  litersPerHectare: number;

  totalLiters: number;

  totalCubicMeters: number;

};

type SavedEstimate = {

  id: number; farm_id: number; farm_name: string; area_hectares: number; crop: string;

  et0: number; daily_rainfall_mm: number; effective_rain_mm: number; crop_coefficient: number;

  efficiency: number; net_depth_mm: number; gross_depth_mm: number; liters_per_hectare: number;

  daily_estimate_liters: number; daily_estimate_cubic_meters: number; created_at: string;

};

const cropProfiles: Record<string, { kc: number; en: string; ar: string }> = {

  wheat: { kc: 0.85, en: "Wheat", ar: "القمح" },

  corn: { kc: 1.05, en: "Corn", ar: "الذرة" },

  maize: { kc: 1.05, en: "Maize", ar: "الذرة" },

  rice: { kc: 1.2, en: "Rice", ar: "الأرز" },

  cotton: { kc: 1.0, en: "Cotton", ar: "القطن" },

  tomato: { kc: 1.05, en: "Tomato", ar: "الطماطم" },

  potato: { kc: 1.0, en: "Potato", ar: "البطاطس" },

  beans: { kc: 0.9, en: "Beans", ar: "الفاصوليا" },

  fava_beans: { kc: 0.9, en: "Fava beans", ar: "الفول" },

  clover: { kc: 0.95, en: "Clover", ar: "البرسيم" },

  onion: { kc: 0.95, en: "Onion", ar: "البصل" },

  sugarcane: { kc: 1.15, en: "Sugarcane", ar: "قصب السكر" },

};

const copy = {

  en: {

    eyebrow: "SMART WATER MANAGEMENT",

    title: "WaterWise",

    subtitle: "Plan irrigation with farm details and current weather in one place.",

    back: "Back",

    selectFarm: "Select farm",

    selectFarmHint: "Choose a registered farm to estimate its irrigation needs.",

    loadingFarms: "Loading your farms...",

    noFarms: "No farms registered yet",

    noFarmsHint: "Add a farm in Farm Explorer first, then return here.",

    loadError: "Could not load farms. Check that the backend is running.",

    retry: "Try again",

    overview: "Farm overview",

    area: "Farm area",

    soil: "Soil type",

    crop: "Current crop",

    location: "Location",

    weather: "Current weather",

    weatherLoading: "Fetching live weather...",

    weatherUnavailable: "Weather data is currently unavailable.",

    noCoordinates: "This farm has no saved coordinates. Add latitude and longitude in Farm Explorer.",

    refresh: "Refresh weather",

    updated: "Updated",

    connected: "Live weather connected",

    disconnected: "Weather unavailable",

    temperature: "Temperature",

    humidity: "Humidity",

    rainfall: "Current precipitation",

    dailyRainfall: "Daily precipitation",

    wind: "Wind speed",

    et0: "Reference evapotranspiration",

    estimate: "Daily irrigation estimate",

    estimateHint: "A preliminary estimate using daily reference evapotranspiration, crop coefficient and rainfall.",

    dailyDepth: "Estimated net water depth",

    grossDepth: "Estimated irrigation depth",

    dailyVolume: "Estimated water volume",

    liters: "liters/day",

    cubicMeters: "m³/day",

    efficiency: "System efficiency",

    efficiencyHint: "Adjust this to match the irrigation system.",

    cropFactor: "Crop coefficient (Kc)",

    cropFactorHint: "Approximate factor; varies with crop stage and local conditions.",

    save: "Save estimate",

    saved: "Estimate saved to the database.",

    saveError: "Could not save the estimate. Check that the backend is running.",

    saving: "Saving...",

    exportCsv: "Export CSV",
    history: "Saved irrigation estimates",

    historyHint: "Recent estimates saved for this farm.",

    historyLoading: "Loading saved estimates...",

    historyEmpty: "No saved estimates for this farm yet.",

    historyError: "Could not load estimate history.",

    savedOn: "Saved",

    reset: "Reset estimate",

    assumptions: "Assumptions and limitations",

    assumption1: "This is a planning estimate, not a sensor measurement or a professional irrigation prescription.",

    assumption2: "Reference evapotranspiration is taken from Open-Meteo's daily FAO ET₀ estimate. Actual crop water needs depend on crop stage, soil moisture, local conditions and irrigation scheduling.",

    assumption3: "Effective rainfall is approximated as 70% of daily precipitation. This is a simplified assumption, not a soil measurement.",

    formula: "Calculation",

    formulaText: "Net irrigation (mm/day) ≈ max(0, ET₀ × Kc − estimated effective rainfall). Gross irrigation = net irrigation ÷ system efficiency. 1 mm over 1 hectare = 10,000 liters.",

    plan: "Irrigation plan",

    planHint: "Use this as a starting point and adapt it to field observations.",

    amountPerHectare: "Liters per hectare per day",

    totalForFarm: "Total for this farm",

    status: "Estimate status",

    preliminary: "Preliminary estimate",

    notAdvice: "Not a substitute for soil moisture measurements or local agricultural advice.",

    invalidArea: "The selected farm must have a valid area greater than zero hectares.",

    unknownCrop: "Unknown crop",

    hectares: "ha",

  },

  ar: {

    eyebrow: "إدارة المياه الذكية",

    title: "WaterWise — إدارة الري",

    subtitle: "خطط للري باستخدام بيانات المزرعة والطقس في مكان واحد.",

    back: "رجوع",

    selectFarm: "اختر المزرعة",

    selectFarmHint: "اختر مزرعة مسجلة لتقدير احتياجاتها من الري.",

    loadingFarms: "جاري تحميل المزارع...",

    noFarms: "لا توجد مزارع مسجلة حتى الآن",

    noFarmsHint: "أضف مزرعة من صفحة استكشاف المزارع أولًا، ثم ارجع هنا.",

    loadError: "تعذر تحميل المزارع. تأكد من تشغيل الـ Backend.",

    retry: "إعادة المحاولة",

    overview: "بيانات المزرعة",

    area: "مساحة المزرعة",

    soil: "نوع التربة",

    crop: "المحصول الحالي",

    location: "الموقع",

    weather: "حالة الطقس الحالية",

    weatherLoading: "جاري جلب بيانات الطقس...",

    weatherUnavailable: "بيانات الطقس غير متاحة حاليًا.",

    noCoordinates: "المزرعة لا تحتوي على إحداثيات محفوظة. أضف خط العرض والطول من صفحة استكشاف المزارع.",

    refresh: "تحديث الطقس",

    updated: "آخر تحديث",

    connected: "اتصال الطقس يعمل",

    disconnected: "الطقس غير متاح",

    temperature: "درجة الحرارة",

    humidity: "الرطوبة",

    rainfall: "الأمطار الحالية",

    dailyRainfall: "الأمطار اليومية",

    wind: "سرعة الرياح",

    et0: "البخر المرجعي",

    estimate: "تقدير احتياجات الري اليومية",

    estimateHint: "تقدير مبدئي باستخدام البخر المرجعي اليومي ومعامل المحصول والأمطار.",

    dailyDepth: "صافي عمق المياه المقدر",

    grossDepth: "عمق الري الإجمالي المقدر",

    dailyVolume: "حجم المياه المقدر",

    liters: "لتر/يوم",

    cubicMeters: "م³/يوم",

    efficiency: "كفاءة نظام الري",

    efficiencyHint: "عدّل القيمة لتناسب نظام الري المستخدم.",

    cropFactor: "معامل المحصول (Kc)",

    cropFactorHint: "قيمة تقريبية تختلف حسب مرحلة نمو المحصول والظروف المحلية.",

    save: "حفظ التقدير",

    saved: "تم حفظ التقدير في قاعدة البيانات.",

    saveError: "تعذر حفظ التقدير. تأكد من تشغيل الـ Backend.",

    saving: "جاري الحفظ...",

    exportCsv: "تصدير CSV",
    history: "سجل تقديرات الري المحفوظة",

    historyHint: "أحدث التقديرات المحفوظة لهذه المزرعة.",

    historyLoading: "جاري تحميل التقديرات المحفوظة...",

    historyEmpty: "لا توجد تقديرات محفوظة لهذه المزرعة حتى الآن.",

    historyError: "تعذر تحميل سجل التقديرات.",

    savedOn: "تاريخ الحفظ",

    reset: "إعادة ضبط التقدير",

    assumptions: "الافتراضات والحدود",

    assumption1: "هذا تقدير للتخطيط فقط، وليس قراءة من حساس أو وصفة ري احترافية.",

    assumption2: "يُستخدم تقدير البخر المرجعي اليومي ET₀ من Open-Meteo. الاحتياج الفعلي يعتمد على مرحلة نمو المحصول ورطوبة التربة والظروف المحلية وجدول الري.",

    assumption3: "يُقدّر المطر الفعال افتراضيًا بنسبة 70% من إجمالي أمطار اليوم. هذا افتراض مبسط وليس قياسًا للتربة.",

    formula: "طريقة الحساب",

    formulaText: "صافي الري (مم/يوم) ≈ أكبر قيمة بين صفر و(ET₀ × معامل المحصول − الأمطار الفعالة المقدرة). الري الإجمالي = صافي الري ÷ كفاءة النظام. كل 1 مم فوق هكتار واحد = 10,000 لتر.",

    plan: "خطة الري",

    planHint: "استخدم التقدير كنقطة بداية وعدّله بناءً على متابعة الأرض.",

    amountPerHectare: "لتر لكل هكتار يوميًا",

    totalForFarm: "الإجمالي للمزرعة",

    status: "حالة التقدير",

    preliminary: "تقدير مبدئي",

    notAdvice: "لا يغني عن قياس رطوبة التربة أو استشارة الإرشاد الزراعي المحلي.",

    invalidArea: "يجب أن تكون مساحة المزرعة المختارة أكبر من صفر هكتار.",

    unknownCrop: "محصول غير محدد",

    hectares: "هكتار",

  },

};

function soilLabel(value: string, lang: Language) {

  const labels: Record<string, { en: string; ar: string }> = {

    clay: { en: "Clay", ar: "طينية" },

    sandy: { en: "Sandy", ar: "رملية" },

    loamy: { en: "Loamy", ar: "طميية" },

    silty: { en: "Silty", ar: "غرينية" },

    other: { en: "Other", ar: "أخرى" },

  };

  return labels[value]?.[lang] ?? (value || "—");

}

function cropProfile(crop: string, lang: Language) {

  const normalized = crop

    .toLowerCase()

    .trim()

    .replace(/[\s-]+/g, "_");

  const profile = cropProfiles[normalized];

  if (profile) return profile;

  const fallback = crop || (lang === "ar" ? "غير محدد" : "Unknown crop");

  return {

    kc: 1,

    en: fallback,

    ar: fallback,

  };

}

function formatNumber(value: number, language: Language, digits = 0) {

  return value.toLocaleString(language === "ar" ? "ar-EG" : "en-US", {

    minimumFractionDigits: digits,

    maximumFractionDigits: digits,

  });

}

export default function WaterWise({ language, onBack }: Props) {

  const t = copy[language];

  const [farms, setFarms] = useState<Farm[]>([]);

  const [farmId, setFarmId] = useState<number | "">("");

  const [loadingFarms, setLoadingFarms] = useState(true);

  const [farmError, setFarmError] = useState("");

  const [weather, setWeather] = useState<WeatherData | null>(null);

  const [weatherLoading, setWeatherLoading] = useState(false);

  const [weatherError, setWeatherError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  const [efficiency, setEfficiency] = useState(75);

  const [kcOverride, setKcOverride] = useState<number | null>(null);

  const [saved, setSaved] = useState(false);

  const [saveError, setSaveError] = useState(false);

  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState<SavedEstimate[]>([]);

  const [historyLoading, setHistoryLoading] = useState(false);

  const [historyError, setHistoryError] = useState(false);

  const farm = useMemo(

    () => farms.find((item) => item.id === farmId) ?? null,

    [farms, farmId]

  );

  const profile = useMemo(

    () => cropProfile(farm?.current_crop ?? "", language),

    [farm?.current_crop, language]

  );

  const kc = kcOverride ?? profile.kc;

  const loadFarms = useCallback(async () => {

    setLoadingFarms(true);

    setFarmError("");

    try {

      const data = await getFarms();

      setFarms(data);

      setFarmId((current) =>

        current !== "" && data.some((item) => item.id === current)

          ? current

          : (data[0]?.id ?? "")

      );

    } catch (error) {

      setFarmError(error instanceof Error ? error.message : t.loadError);

    } finally {

      setLoadingFarms(false);

    }

  }, [t.loadError]);

  useEffect(() => {

    void loadFarms();

  }, [loadFarms]);

  const loadHistory = useCallback(async (selectedFarmId: number) => {

    setHistoryLoading(true);

    setHistoryError(false);

    try {

      const records = await apiRequest<SavedEstimate[]>(`/api/waterwise/estimates?farm_id=${selectedFarmId}&limit=20`);

      setHistory(records);

    } catch {

      setHistory([]);

      setHistoryError(true);

    } finally {

      setHistoryLoading(false);

    }

  }, []);

  useEffect(() => {

    if (farmId === "") { setHistory([]); return; }

    void loadHistory(farmId);

  }, [farmId, loadHistory]);

  useEffect(() => {

    let cancelled = false;

    async function loadWeather() {

      setWeather(null);

      setWeatherError("");

      if (!farm || farm.latitude == null || farm.longitude == null) {

        setWeatherLoading(false);

        if (farm) setWeatherError(t.noCoordinates);

        return;

      }

      setWeatherLoading(true);

      try {

        const query = new URLSearchParams({

          latitude: String(farm.latitude),

          longitude: String(farm.longitude),

          current:

            "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",

          daily: "et0_fao_evapotranspiration,precipitation_sum",

          forecast_days: "1",

          timezone: "auto",

        });

        const response = await fetch(

          `https://api.open-meteo.com/v1/forecast?${query}`

        );

        if (!response.ok) {

          throw new Error(`Weather service returned ${response.status}`);

        }

        const data = await response.json();

        const et0 = data.daily?.et0_fao_evapotranspiration?.[0];

        const dailyPrecipitation = data.daily?.precipitation_sum?.[0];

        if (

          !data.current ||

          typeof data.current.temperature_2m !== "number" ||

          typeof et0 !== "number" ||

          typeof dailyPrecipitation !== "number"

        ) {

          throw new Error("Required daily weather data is unavailable.");

        }

        if (!cancelled) {

          setWeather({

            temperature: data.current.temperature_2m,

            humidity: data.current.relative_humidity_2m ?? 50,

            precipitation: data.current.precipitation ?? 0,

            dailyPrecipitation,

            et0,

            windSpeed: data.current.wind_speed_10m ?? null,

            fetchedAt: new Date(),

          });

        }

      } catch (error) {

        if (!cancelled) {

          setWeatherError(

            error instanceof Error ? error.message : t.weatherUnavailable

          );

        }

      } finally {

        if (!cancelled) setWeatherLoading(false);

      }

    }

    void loadWeather();

    return () => {

      cancelled = true;

    };

  }, [farm, refreshKey, t.noCoordinates, t.weatherUnavailable]);

  const estimate: Estimate | null = useMemo(() => {

    if (!farm || !weather) return null;

    const area = Number(farm.area_hectares);

    if (!Number.isFinite(area) || area <= 0) return null;

    const efficiencyFraction = Math.min(100, Math.max(30, efficiency)) / 100;

    // افتراض مبسط: 70% من أمطار اليوم تُحسب كأمطار فعالة.

    const effectiveRain = Math.max(0, weather.dailyPrecipitation * 0.7);

    // صافي عمق المياه قبل احتساب فاقد نظام الري.

    const netDepth = Math.max(0, weather.et0 * kc - effectiveRain);

    // عمق المياه المطلوب ضخه بعد مراعاة كفاءة النظام.

    const grossDepth = netDepth / efficiencyFraction;

    // كل 1 مم فوق هكتار واحد يعادل 10,000 لتر.

    const litersPerHectare = grossDepth * 10000;

    const totalLiters = litersPerHectare * area;

    return {

      estimatedEt0: weather.et0,

      effectiveRain,

      netDepth,

      grossDepth,

      litersPerHectare,

      totalLiters,

      totalCubicMeters: totalLiters / 1000,

    };

  }, [farm, weather, kc, efficiency]);

  function resetEstimate() {

    setEfficiency(75);

    setKcOverride(null);

    setSaved(false);

    setSaveError(false);

  }

  async function saveEstimate() {

    if (!estimate || !farm || !weather || saving) return;

    setSaving(true); setSaved(false); setSaveError(false);

    try {

      await apiRequest<SavedEstimate>("/api/waterwise/estimates", {

        method: "POST",

        body: JSON.stringify({

          farm_id: farm.id, area_hectares: Number(farm.area_hectares),

          crop: farm.current_crop || profile[language], et0: estimate.estimatedEt0,

          daily_rainfall_mm: weather.dailyPrecipitation, effective_rain_mm: estimate.effectiveRain,

          crop_coefficient: kc, efficiency, net_depth_mm: estimate.netDepth,

          gross_depth_mm: estimate.grossDepth, liters_per_hectare: estimate.litersPerHectare,

          daily_estimate_liters: estimate.totalLiters,

          daily_estimate_cubic_meters: estimate.totalCubicMeters,

        }),

      });

      setSaved(true);

      await loadHistory(farm.id);

    } catch { setSaved(false); setSaveError(true); }

    finally { setSaving(false); }

  }

  function exportHistoryCsv() {
    if (history.length === 0) return;

    const headers = language === "ar"
      ? ["رقم التقدير", "المزرعة", "المساحة (هكتار)", "المحصول", "ET0 (مم)", "الأمطار اليومية (مم)", "الأمطار الفعالة (مم)", "معامل المحصول", "كفاءة الري (%)", "صافي العمق (مم)", "عمق الري الإجمالي (مم)", "لتر/هكتار", "التقدير اليومي (لتر)", "التقدير اليومي (م³)", "تاريخ الحفظ"]
      : ["Estimate ID", "Farm", "Area (ha)", "Crop", "ET0 (mm)", "Daily rainfall (mm)", "Effective rain (mm)", "Crop coefficient", "Efficiency (%)", "Net depth (mm)", "Gross depth (mm)", "Liters per hectare", "Daily estimate (liters)", "Daily estimate (m3)", "Saved at"];

    const escapeCsv = (value: unknown) => {
      const text = value == null ? "" : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };

    const rows = history.map((item) => [
      item.id, item.farm_name, item.area_hectares, item.crop, item.et0,
      item.daily_rainfall_mm, item.effective_rain_mm, item.crop_coefficient,
      item.efficiency, item.net_depth_mm, item.gross_depth_mm,
      item.liters_per_hectare, item.daily_estimate_liters,
      item.daily_estimate_cubic_meters, item.created_at,
    ]);
    const csv = "\uFEFF" + [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `waterwise-estimates-farm-${farmId}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (

    <main

      className="waterwise-page"

      dir={language === "ar" ? "rtl" : "ltr"}

    >

      <div className="ww-container">

        <header className="ww-hero">

          <div className="ww-hero-copy">

            <span className="ww-eyebrow">

              <i />

              {t.eyebrow}

            </span>

            <h1>{t.title}</h1>

            <p>{t.subtitle}</p>

            {onBack && (

              <button

                type="button"

                className="ww-back"

                onClick={onBack}

              >

                ← {t.back}

              </button>

            )}

          </div>

          <div className="ww-hero-art" aria-hidden="true">

            <span className="ww-orbit ww-orbit-a" />

            <span className="ww-orbit ww-orbit-b" />

            <span>💧</span>

            <small>EVERY DROP COUNTS</small>

          </div>

        </header>

        <section className="ww-farm-picker">

          <span className="ww-picker-icon">🌱</span>

          <div className="ww-picker-copy">

            <label htmlFor="ww-farm">{t.selectFarm}</label>

            <span>{t.selectFarmHint}</span>

          </div>

          <select

            id="ww-farm"

            value={farmId}

            disabled={loadingFarms || farms.length === 0}

            onChange={(event) => {

              const value = event.target.value;

              setFarmId(value === "" ? "" : Number(value));

              setSaved(false);

              setSaveError(false);

              setKcOverride(null);

            }}

          >

            {farms.map((item) => (

              <option key={item.id} value={item.id}>

                {item.name} — {item.location}

              </option>

            ))}

          </select>

        </section>

        {loadingFarms ? (

          <section className="ww-state">

            <span className="ww-spinner" />

            <p>{t.loadingFarms}</p>

          </section>

        ) : farmError ? (

          <section className="ww-error">

            <p>{farmError}</p>

            <button type="button" onClick={() => void loadFarms()}>

              {t.retry}

            </button>

          </section>

        ) : farms.length === 0 ? (

          <section className="ww-state">

            <span className="ww-empty-icon">🌿</span>

            <h2>{t.noFarms}</h2>

            <p>{t.noFarmsHint}</p>

          </section>

        ) : farm ? (

          <>

            <section className="ww-section">

              <div className="ww-heading">

                <div>

                  <span className="ww-kicker">FARM PROFILE</span>

                  <h2>{t.overview}</h2>

                </div>

                <span className="ww-tag">

                  #{farm.id} · {farm.name}

                </span>

              </div>

              <div className="ww-overview-grid">

                <article className="ww-card">

                  <span className="ww-icon ww-green">📍</span>

                  <small>{t.location}</small>

                  <h3>{farm.location || "—"}</h3>

                  <div className="ww-divider" />

                  <div className="ww-mini-grid">

                    <div>

                      <small>{t.area}</small>

                      <strong>

                        {formatNumber(Number(farm.area_hectares), language, 2)}{" "}

                        {t.hectares}

                      </strong>

                    </div>

                    <div>

                      <small>{t.soil}</small>

                      <strong>{soilLabel(farm.soil_type, language)}</strong>

                    </div>

                  </div>

                </article>

                <article className="ww-card">

                  <span className="ww-icon ww-orange">🌾</span>

                  <small>{t.crop}</small>

                  <h3>{profile[language]}</h3>

                  <div className="ww-divider" />

                  <div className="ww-mini-grid">

                    <div>

                      <small>{t.cropFactor}</small>

                      <strong>{kc.toFixed(2)}</strong>

                    </div>

                    <div>

                      <small>{t.status}</small>

                      <strong>{t.preliminary}</strong>

                    </div>

                  </div>

                </article>

                <article className="ww-card ww-weather-card">

                  <div className="ww-weather-head">

                    <span className="ww-icon ww-blue">🌤️</span>

                    <div>

                      <small>{t.weather}</small>

                      <h3>{weather ? t.connected : t.disconnected}</h3>

                    </div>

                  </div>

                  <div className="ww-weather-actions">

                    <span

                      className={`ww-status ${

                        weather ? "is-live" : "is-off"

                      }`}

                    >

                      <i />

                      {weather ? t.connected : t.disconnected}

                    </span>

                    <button

                      type="button"

                      onClick={() => setRefreshKey((value) => value + 1)}

                      disabled={

                        weatherLoading ||

                        farm.latitude == null ||

                        farm.longitude == null

                      }

                    >

                      ↻ {t.refresh}

                    </button>

                  </div>

                  {weatherLoading ? (

                    <div className="ww-weather-loading">

                      <span className="ww-small-spinner" />

                      <span>{t.weatherLoading}</span>

                    </div>

                  ) : weather ? (

                    <div className="ww-weather-values">

                      <div>

                        <span>🌡️</span>

                        <small>{t.temperature}</small>

                        <strong>{weather.temperature}°C</strong>

                      </div>

                      <div>

                        <span>💧</span>

                        <small>{t.humidity}</small>

                        <strong>{weather.humidity}%</strong>

                      </div>

                      <div>

                        <span>🌧️</span>

                        <small>{t.rainfall}</small>

                        <strong>{weather.precipitation} mm</strong>

                      </div>

                      <div>

                        <span>💨</span>

                        <small>{t.wind}</small>

                        <strong>

                          {weather.windSpeed == null

                            ? "—"

                            : `${weather.windSpeed} km/h`}

                        </strong>

                      </div>

                    </div>

                  ) : (

                    <p className="ww-muted">

                      {weatherError ||

                        (farm.latitude == null || farm.longitude == null

                          ? t.noCoordinates

                          : t.weatherUnavailable)}

                    </p>

                  )}

                  {weather && (

                    <>

                      <div className="ww-mini-grid">

                        <div>

                          <small>{t.dailyRainfall}</small>

                          <strong>

                            {formatNumber(

                              weather.dailyPrecipitation,

                              language,

                              2

                            )}{" "}

                            mm

                          </strong>

                        </div>

                        <div>

                          <small>{t.et0}</small>

                          <strong>

                            {formatNumber(weather.et0, language, 2)} mm/day

                          </strong>

                        </div>

                      </div>

                      <p className="ww-updated">

                        {t.updated}:{" "}

                        {weather.fetchedAt.toLocaleTimeString(

                          language === "ar" ? "ar-EG" : "en-US",

                          { hour: "2-digit", minute: "2-digit" }

                        )}

                      </p>

                    </>

                  )}

                </article>

              </div>

            </section>

            <section className="ww-section">

              <div className="ww-heading">

                <div>

                  <span className="ww-kicker">WATER ESTIMATION</span>

                  <h2>{t.estimate}</h2>

                  <p>{t.estimateHint}</p>

                </div>

                <span className="ww-status-pill">{t.preliminary}</span>

              </div>

              {!weather ? (

                <section className="ww-state ww-state-inline">

                  <span className="ww-empty-icon">💧</span>

                  <p>

                    {weatherLoading

                      ? t.weatherLoading

                      : weatherError || t.weatherUnavailable}

                  </p>

                </section>

              ) : !estimate ? (

                <section className="ww-error">

                  <p>{t.invalidArea}</p>

                </section>

              ) : (

                <div className="ww-estimate-layout">

                  <article className="ww-estimate-main">

                    <div className="ww-estimate-label">

                      <span>💧</span>

                      <div>

                        <small>{t.dailyVolume}</small>

                        <span>{t.totalForFarm}</span>

                      </div>

                    </div>

                    <div className="ww-big-number">

                      {formatNumber(estimate.totalLiters, language)}

                      <small>{t.liters}</small>

                    </div>

                    <div className="ww-volume-sub">

                      {formatNumber(estimate.totalCubicMeters, language, 2)}{" "}

                      {t.cubicMeters}

                    </div>

                    <div className="ww-estimate-bar">

                      <span

                        style={{

                          width: `${Math.min(

                            100,

                            (estimate.grossDepth / 10) * 100

                          )}%`,

                        }}

                      />

                    </div>

                    <div className="ww-estimate-bottom">

                      <span>

                        {t.dailyDepth}:{" "}

                        {formatNumber(estimate.netDepth, language, 2)} mm

                      </span>

                      <span>

                        {t.grossDepth}:{" "}

                        {formatNumber(estimate.grossDepth, language, 2)} mm

                      </span>

                    </div>

                    <div className="ww-estimate-callout">

                      <span>ℹ️</span>

                      <p>{t.notAdvice}</p>

                    </div>

                  </article>

                  <article className="ww-card ww-controls">

                    <span className="ww-kicker">MODEL INPUTS</span>

                    <h3>{t.plan}</h3>

                    <p className="ww-control-description">{t.planHint}</p>

                    <div className="ww-control-row">

                      <label htmlFor="ww-kc">

                        {t.cropFactor} <strong>{kc.toFixed(2)}</strong>

                      </label>

                      <input

                        id="ww-kc"

                        type="range"

                        min="0.4"

                        max="1.4"

                        step="0.05"

                        value={kc}

                        onChange={(event) => {

                          setKcOverride(Number(event.target.value));

                          setSaved(false);

                          setSaveError(false);

                        }}

                      />

                      <p>{t.cropFactorHint}</p>

                    </div>

                    <div className="ww-control-row">

                      <label htmlFor="ww-efficiency">

                        {t.efficiency} <strong>{efficiency}%</strong>

                      </label>

                      <input

                        id="ww-efficiency"

                        type="range"

                        min="30"

                        max="100"

                        step="5"

                        value={efficiency}

                        onChange={(event) => {

                          setEfficiency(Number(event.target.value));

                          setSaved(false);

                          setSaveError(false);

                        }}

                      />

                      <p>{t.efficiencyHint}</p>

                    </div>

                    <div className="ww-control-summary">

                      <span>{t.amountPerHectare}</span>

                      <strong>

                        {formatNumber(estimate.litersPerHectare, language)} L

                      </strong>

                    </div>

                    <div className="ww-actions">

                      <button
                        type="button"
                        className="ww-primary"
                        onClick={() => void saveEstimate()}
                        disabled={saving || !estimate || !weather}
                        aria-busy={saving}
                      >
                        {saving ? t.saving : t.save}
                      </button>

                      <button

                        type="button"

                        className="ww-secondary"
                        onClick={resetEstimate}
                        disabled={saving}
                      >

                        {t.reset}

                      </button>

                    </div>

                    {saved && (

                      <p className="ww-saved" role="status">

                        ✓ {t.saved}

                      </p>

                    )}

                    {saveError && (

                      <p className="ww-muted" role="alert">

                        {t.saveError}

                      </p>

                    )}

                  </article>

                </div>

              )}

            </section>

            <section className="ww-section">

              <div className="ww-heading">

                <div>

                  <span className="ww-kicker">DATABASE HISTORY</span>

                  <h2>{t.history}</h2>

                  <p>{t.historyHint}</p>

                </div>
                <button
                  type="button"
                  className="ww-secondary"
                  onClick={exportHistoryCsv}
                  disabled={historyLoading || history.length === 0}
                >
                  ↓ {t.exportCsv}
                </button>
              </div>

              {historyLoading ? (

                <section className="ww-state ww-state-inline"><span className="ww-small-spinner" /><p>{t.historyLoading}</p></section>

              ) : historyError ? (

                <section className="ww-error" role="alert"><p>{t.historyError}</p><button type="button" onClick={() => farm && void loadHistory(farm.id)}>{t.retry}</button></section>

              ) : history.length === 0 ? (

                <section className="ww-state ww-state-inline"><p>{t.historyEmpty}</p></section>

              ) : (

                <div className="ww-overview-grid">

                  {history.map((item) => (

                    <article className="ww-card" key={item.id}>

                      <span className="ww-icon ww-blue">💧</span>

                      <small>{t.savedOn}</small>

                      <h3>{new Date(item.created_at.endsWith("Z") ? item.created_at : `${item.created_at}Z`).toLocaleString(language === "ar" ? "ar-EG" : "en-US")}</h3>

                      <div className="ww-divider" />

                      <div className="ww-mini-grid">

                        <div><small>{t.dailyVolume}</small><strong>{formatNumber(item.daily_estimate_liters, language)} L</strong></div>

                        <div><small>{t.cropFactor}</small><strong>{formatNumber(item.crop_coefficient, language, 2)}</strong></div>

                        <div><small>{t.efficiency}</small><strong>{formatNumber(item.efficiency, language)}%</strong></div>

                        <div><small>{t.grossDepth}</small><strong>{formatNumber(item.gross_depth_mm, language, 2)} mm</strong></div>

                      </div>

                    </article>

                  ))}

                </div>

              )}

            </section>

            <section className="ww-section">

              <div className="ww-heading">

                <div>

                  <span className="ww-kicker">HOW IT WORKS</span>

                  <h2>{t.assumptions}</h2>

                </div>

              </div>

              <div className="ww-assumptions">

                <p>

                  <span>01</span>

                  {t.assumption1}

                </p>

                <p>

                  <span>02</span>

                  {t.assumption2}

                </p>

                <p>

                  <span>03</span>

                  {t.assumption3}

                </p>

                <div className="ww-formula">

                  <strong>{t.formula}</strong>

                  <p>{t.formulaText}</p>

                </div>

              </div>

            </section>

          </>

        ) : null}

        <footer className="ww-footer">

          <span>

            <i /> TERRASHIFT AI · WATERWISE

          </span>

          <span>{t.notAdvice}</span>

        </footer>

      </div>

    </main>

  );

}
