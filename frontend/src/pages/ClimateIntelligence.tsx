import { useEffect, useMemo, useState } from "react";
import { getFarms, type Farm } from "../services/farms";
import "../styles/ClimateIntelligence.css";

type Language = "ar" | "en";
type Props = { language: Language; onBack?: () => void };

type WeatherData = {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  precipitationProbability: number;
  et0: number;
  weatherCode: number;
};

const copy = {
  en: {
    eyebrow: "CLIMATE & FARM INTELLIGENCE",
    title: "Climate Intelligence",
    subtitle: "Turn live weather conditions into clearer, more informed farm decisions.",
    back: "Back to dashboard",
    chooseFarm: "Choose a farm",
    chooseFarmHint: "Weather is requested using the selected farm's saved coordinates.",
    loadingFarms: "Loading farms…",
    noFarms: "No farms found",
    noFarmsHint: "Add a farm with latitude and longitude in Farm Explorer to view local weather.",
    retry: "Retry",
    weatherNow: "Current conditions",
    forecast: "Today's outlook",
    temperature: "Temperature",
    feelsLike: "Feels like",
    humidity: "Humidity",
    wind: "Wind speed",
    rain: "Precipitation",
    rainChance: "Precipitation chance",
    et0: "Reference ET₀",
    farm: "Farm",
    area: "Area",
    soil: "Soil type",
    crop: "Current crop",
    recommendations: "Farm recommendations",
    loadingWeather: "Fetching live weather…",
    noCoordinates: "This farm has no saved coordinates. Update its latitude and longitude in Farm Explorer.",
    weatherError: "Could not load live weather. Check your internet connection and try again.",
    refresh: "Refresh weather",
    updated: "Updated just now",
    rainAdvice: "Rain may contribute to crop water needs. Check actual rainfall and soil moisture before changing irrigation.",
    dryAdvice: "Conditions may increase water demand. Check root-zone moisture and the crop stage before irrigating.",
    windAdvice: "Wind can increase spray drift and irrigation losses. Avoid spraying in unsuitable wind conditions.",
    generalAdvice: "Use the forecast alongside field observations and local agronomic guidance.",
    disclaimer: "Weather values come from Open-Meteo. Forecasts are estimates, not measurements from farm sensors. Reference ET₀ is a weather-based estimate and is not the crop's exact water requirement.",
    clear: "Clear / mainly clear",
    cloudy: "Partly cloudy",
    overcast: "Overcast",
    fog: "Fog",
    drizzle: "Drizzle",
    rainText: "Rain",
    snow: "Snow",
    showers: "Showers",
    storm: "Thunderstorm",
    unknown: "Weather conditions",
    error: "Something went wrong.",
    latLon: "Coordinates",
    unavailable: "—",
  },
  ar: {
    eyebrow: "ذكاء المناخ والمزرعة",
    title: "Climate Intelligence — ذكاء المناخ",
    subtitle: "حوّل بيانات الطقس الحالية إلى قرارات أوضح وأكثر وعيًا للمزرعة.",
    back: "العودة للوحة التحكم",
    chooseFarm: "اختر المزرعة",
    chooseFarmHint: "يتم جلب الطقس باستخدام إحداثيات المزرعة المسجلة.",
    loadingFarms: "جاري تحميل المزارع…",
    noFarms: "لا توجد مزارع",
    noFarmsHint: "أضف مزرعة بإحداثيات خط العرض والطول من صفحة استكشاف المزرعة لعرض الطقس المحلي.",
    retry: "إعادة المحاولة",
    weatherNow: "الحالة الحالية",
    forecast: "نظرة على طقس اليوم",
    temperature: "درجة الحرارة",
    feelsLike: "المحسوسة",
    humidity: "الرطوبة",
    wind: "سرعة الرياح",
    rain: "الأمطار",
    rainChance: "احتمال هطول الأمطار",
    et0: "البخر المرجعي ET₀",
    farm: "المزرعة",
    area: "المساحة",
    soil: "نوع التربة",
    crop: "المحصول الحالي",
    recommendations: "توصيات للمزرعة",
    loadingWeather: "جاري جلب بيانات الطقس…",
    noCoordinates: "المزرعة دي مفيش لها إحداثيات محفوظة. حدّث خط العرض والطول من صفحة استكشاف المزرعة.",
    weatherError: "تعذر تحميل الطقس الحالي. تحقق من اتصال الإنترنت وحاول مرة أخرى.",
    refresh: "تحديث الطقس",
    updated: "تم التحديث الآن",
    rainAdvice: "الأمطار قد تساهم في احتياجات المحصول للمياه. راجع المطر الفعلي ورطوبة التربة قبل تغيير خطة الري.",
    dryAdvice: "الظروف قد تزيد الطلب على المياه. افحص رطوبة منطقة الجذور ومرحلة نمو المحصول قبل الري.",
    windAdvice: "الرياح قد تزيد انجراف الرش وفواقد الري. تجنب الرش في ظروف الرياح غير المناسبة.",
    generalAdvice: "استخدم التوقعات مع ملاحظات الحقل والإرشادات الزراعية المحلية.",
    disclaimer: "بيانات الطقس من Open-Meteo. التوقعات تقديرية وليست قياسات من حساسات المزرعة. البخر المرجعي ET₀ تقدير يعتمد على الطقس وليس الاحتياج المائي الدقيق للمحصول.",
    clear: "صحو / صحو غالبًا",
    cloudy: "غائم جزئيًا",
    overcast: "غائم",
    fog: "شبورة / ضباب",
    drizzle: "رذاذ",
    rainText: "أمطار",
    snow: "ثلوج",
    showers: "زخات مطر",
    storm: "عواصف رعدية",
    unknown: "حالة الطقس",
    error: "حدث خطأ غير متوقع.",
    latLon: "الإحداثيات",
    unavailable: "—",
  },
} as const;

function describeWeather(code: number, language: Language): string {
  const t = copy[language];
  if (code === 0) return t.clear;
  if ([1, 2].includes(code)) return t.cloudy;
  if (code === 3) return t.overcast;
  if ([45, 48].includes(code)) return t.fog;
  if ([51, 53, 55, 56, 57].includes(code)) return t.drizzle;
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return t.rainText;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return t.snow;
  if ([95, 96, 99].includes(code)) return t.storm;
  return t.unknown;
}

function soilLabel(value: string, language: Language) {
  if (language === "en") return value || "Not specified";
  const values: Record<string, string> = {
    clay: "طينية",
    sandy: "رملية",
    loamy: "طميية",
    silty: "غرينية",
    other: "أخرى",
  };
  return values[value] ?? value ?? "غير محدد";
}

export default function ClimateIntelligence({ language, onBack }: Props) {
  const t = copy[language];
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmId, setFarmId] = useState<number | "">("");
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [farmsError, setFarmsError] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const [, setHasLoadedWeather] = useState(false);

  const farm = useMemo(
    () => farms.find((item) => item.id === farmId) ?? null,
    [farms, farmId]
  );

  async function loadFarms() {
    setLoadingFarms(true);
    setFarmsError("");
    try {
      const data = await getFarms();
      setFarms(data);
      setFarmId((current) =>
        current !== "" && data.some((item) => item.id === current)
          ? current
          : data[0]?.id ?? ""
      );
    } catch (error) {
      console.error("Climate Intelligence: failed to load farms", error);
      setFarmsError(error instanceof Error ? error.message : t.error);
    } finally {
      setLoadingFarms(false);
    }
  }

  async function loadWeather(selectedFarm: Farm) {
    if (selectedFarm.latitude == null || selectedFarm.longitude == null) {
      setWeather(null);
      setWeatherError(t.noCoordinates);
      setHasLoadedWeather(true);
      return;
    }

    setLoadingWeather(true);
    setWeatherError("");
    try {
      const params = new URLSearchParams({
        latitude: String(selectedFarm.latitude),
        longitude: String(selectedFarm.longitude),
        current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m",
        daily: "precipitation_probability_max,et0_fao_evapotranspiration,precipitation_sum",
        timezone: "auto",
        forecast_days: "1",
      });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
      if (!response.ok) throw new Error(`Weather request failed (${response.status})`);
      const payload = await response.json();
      const current = payload.current;
      const daily = payload.daily;
      if (!current || !daily) throw new Error("Weather data is incomplete");

      setWeather({
        temperature: Number(current.temperature_2m),
        apparentTemperature: Number(current.apparent_temperature),
        humidity: Number(current.relative_humidity_2m),
        windSpeed: Number(current.wind_speed_10m),
        precipitation: Number(daily.precipitation_sum?.[0] ?? current.precipitation ?? 0),
        precipitationProbability: Number(daily.precipitation_probability_max?.[0] ?? 0),
        et0: Number(daily.et0_fao_evapotranspiration?.[0] ?? 0),
        weatherCode: Number(current.weather_code ?? -1),
      });
      setHasLoadedWeather(true);
    } catch (error) {
      console.error("Climate Intelligence: failed to load weather", error);
      setWeather(null);
      setWeatherError(t.weatherError);
      setHasLoadedWeather(true);
    } finally {
      setLoadingWeather(false);
    }
  }

  useEffect(() => {
    void loadFarms();
  }, []);

  useEffect(() => {
    if (!farm) {
      setWeather(null);
      setWeatherError("");
      return;
    }
    void loadWeather(farm);
  }, [farm?.id, farm?.latitude, farm?.longitude, language]);

  const recommendations = useMemo(() => {
    if (!weather) return [];
    const result: { icon: string; title: string; text: string; tone: string }[] = [];
    if (weather.precipitation >= 5 || weather.precipitationProbability >= 60) {
      result.push({ icon: "🌧️", title: language === "ar" ? "راجع خطة الري" : "Review irrigation", text: t.rainAdvice, tone: "blue" });
    }
    if (weather.et0 >= 4 || weather.temperature >= 32 || weather.humidity < 30) {
      result.push({ icon: "💧", title: language === "ar" ? "راقب الإجهاد المائي" : "Watch water stress", text: t.dryAdvice, tone: "amber" });
    }
    if (weather.windSpeed >= 20) {
      result.push({ icon: "🌬️", title: language === "ar" ? "انتبه للرياح" : "Wind advisory", text: t.windAdvice, tone: "amber" });
    }
    if (result.length === 0) {
      result.push({ icon: "🌱", title: language === "ar" ? "استمر في المتابعة" : "Keep monitoring", text: t.generalAdvice, tone: "green" });
    }
    return result;
  }, [weather, language, t]);

  return (
    <main className="climate-page" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="climate-container">
        <header className="climate-hero">
          <div className="climate-hero-copy">
            <span className="climate-eyebrow"><i />{t.eyebrow}</span>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
            {onBack && <button type="button" className="climate-back" onClick={onBack}>← {t.back}</button>}
          </div>
          <div className="climate-hero-art" aria-hidden="true">
            <span className="climate-orbit climate-orbit-one" />
            <span className="climate-orbit climate-orbit-two" />
            <span className="climate-weather-emoji">🌤️</span>
            <small>WEATHER · CROPS · INSIGHTS</small>
          </div>
        </header>

        <section className="climate-farm-select">
          <span className="climate-farm-icon">🌾</span>
          <div className="climate-select-copy">
            <label htmlFor="climate-farm">{t.chooseFarm}</label>
            <span>{t.chooseFarmHint}</span>
          </div>
          <select id="climate-farm" value={farmId} disabled={loadingFarms || farms.length === 0} onChange={(event) => setFarmId(event.target.value ? Number(event.target.value) : "")}>
            {farms.length === 0 && <option value="">{loadingFarms ? t.loadingFarms : t.noFarms}</option>}
            {farms.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.location}</option>)}
          </select>
        </section>

        {loadingFarms ? (
          <section className="climate-state"><span className="climate-spinner" /><p>{t.loadingFarms}</p></section>
        ) : farmsError ? (
          <section className="climate-error" role="alert"><p>{farmsError}</p><button type="button" onClick={() => void loadFarms()}>{t.retry}</button></section>
        ) : farms.length === 0 ? (
          <section className="climate-state"><span className="climate-empty-icon">🌿</span><h2>{t.noFarms}</h2><p>{t.noFarmsHint}</p></section>
        ) : farm ? (
          <>
            <section className="climate-section">
              <div className="climate-section-heading">
                <div><span className="climate-kicker">LIVE WEATHER</span><h2>{t.weatherNow}</h2><p>{farm.name} · {farm.location}</p></div>
                <button type="button" className="climate-refresh" onClick={() => void loadWeather(farm)} disabled={loadingWeather}>↻ {t.refresh}</button>
              </div>
              {loadingWeather ? (
                <section className="climate-state climate-state-inline"><span className="climate-spinner" /><p>{t.loadingWeather}</p></section>
              ) : weatherError ? (
                <section className="climate-error" role="alert"><p>{weatherError}</p>{farm.latitude != null && farm.longitude != null && <button type="button" onClick={() => void loadWeather(farm)}>{t.retry}</button>}</section>
              ) : weather ? (
                <>
                  <div className="climate-current-card">
                    <div className="climate-current-main"><span className="climate-current-icon">🌤️</span><div><span>{describeWeather(weather.weatherCode, language)}</span><strong>{Math.round(weather.temperature)}°C</strong><small>{t.feelsLike}: {Math.round(weather.apparentTemperature)}°C</small></div></div>
                    <div className="climate-current-meta"><span>{t.updated}</span><small>{t.latLon}: {farm.latitude}, {farm.longitude}</small></div>
                  </div>
                  <div className="climate-metrics-grid">
                    <article className="climate-metric"><span className="climate-metric-icon climate-blue">💧</span><small>{t.humidity}</small><strong>{Math.round(weather.humidity)}%</strong><div className="climate-meter"><i style={{ width: `${Math.min(100, Math.max(0, weather.humidity))}%` }} /></div></article>
                    <article className="climate-metric"><span className="climate-metric-icon climate-purple">🌬️</span><small>{t.wind}</small><strong>{weather.windSpeed.toFixed(1)} <em>km/h</em></strong><p>{weather.windSpeed >= 20 ? (language === "ar" ? "رياح نشطة" : "Breezy") : (language === "ar" ? "سرعة الرياح" : "Wind conditions")}</p></article>
                    <article className="climate-metric"><span className="climate-metric-icon climate-blue">🌧️</span><small>{t.rain}</small><strong>{weather.precipitation.toFixed(1)} <em>mm</em></strong><p>{t.rainChance}: {Math.round(weather.precipitationProbability)}%</p></article>
                    <article className="climate-metric"><span className="climate-metric-icon climate-green">☀️</span><small>{t.et0}</small><strong>{weather.et0.toFixed(1)} <em>mm/day</em></strong><p>{t.forecast}</p></article>
                  </div>
                </>
              ) : null}
            </section>

            <section className="climate-section">
              <div className="climate-section-heading"><div><span className="climate-kicker">FIELD CONTEXT</span><h2>{t.farm}</h2></div></div>
              <div className="climate-farm-facts">
                <article><span>📐</span><small>{t.area}</small><strong>{farm.area_hectares} ha</strong></article>
                <article><span>🪨</span><small>{t.soil}</small><strong>{soilLabel(farm.soil_type, language)}</strong></article>
                <article><span>🌱</span><small>{t.crop}</small><strong>{farm.current_crop || t.unavailable}</strong></article>
              </div>
            </section>

            {weather && (
              <section className="climate-section">
                <div className="climate-section-heading"><div><span className="climate-kicker">WEATHER-BASED GUIDANCE</span><h2>{t.recommendations}</h2></div></div>
                <div className="climate-recommendations">
                  {recommendations.map((item, index) => <article className={`climate-recommendation climate-recommendation-${item.tone}`} key={`${item.tone}-${index}`}><span className="climate-recommendation-icon">{item.icon}</span><div><strong>{item.title}</strong><p>{item.text}</p></div></article>)}
                </div>
              </section>
            )}

            <aside className="climate-disclaimer"><span>ℹ️</span><p>{t.disclaimer}</p></aside>
          </>
        ) : null}

        <footer className="climate-footer"><span><i /> TERRASHIFT AI · CLIMATE INTELLIGENCE</span><span>WEATHER-INFORMED FARMING</span></footer>
      </div>
    </main>
  );
}
