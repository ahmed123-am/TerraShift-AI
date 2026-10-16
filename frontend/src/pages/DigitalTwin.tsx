import { useEffect, useMemo, useState } from "react";







import { getFarms, type Farm } from "../services/farms";







import "../styles/DigitalTwin.css";















type Language = "ar" | "en";







type Props = { language: Language; onBack?: () => void };















const text = {







  en: {







    eyebrow: "DIGITAL FARM MODEL", title: "Digital Twin",







    subtitle: "A digital overview of your registered farm and its available planning tools.",







    back: "Back to dashboard", chooseFarm: "Choose farm", chooseHint: "Select a farm to view its saved profile.",







    loading: "Loading farms…", noFarms: "No farms found",







    noFarmsHint: "Create a farm in Farm Explorer to start its digital profile.",







    retry: "Try again", overview: "Farm overview", area: "Farm area", soil: "Soil type",







    crop: "Current crop", location: "Location", coordinates: "Coordinates",







    notSet: "Not specified", model: "Farm profile", operations: "Planning tools",







    water: "Water planning", waterText: "Open WaterWise to estimate irrigation using available weather data.",







    rotation: "Crop rotation", rotationText: "Review crop rotation recommendations and saved plans.",







    soilHealth: "Soil health", soilText: "Review the soil assessment based on values you enter.",







    climate: "Climate", climateText: "Review local weather when farm coordinates are available.",







    open: "View details", close: "Close", detailsTitle: "Tool details", dataStatus: "Data availability", savedProfile: "Saved farm profile",







    saved: "Available", liveSensors: "Live sensor feed", notConnected: "Not connected",







    disclaimerTitle: "About this digital twin",







    disclaimer: "This page uses saved farm records only. It does not claim to show live sensor telemetry, satellite imagery, or a real 3D model.",







    error: "Could not load farms. Check that the backend is running.",







    hectares: "ha", latitude: "Latitude", longitude: "Longitude",







  },







  ar: {







    eyebrow: "النموذج الرقمي للمزرعة", title: "Digital Twin — التوأم الرقمي",







    subtitle: "عرض رقمي للمزرعة المسجلة وأدوات التخطيط المتاحة لها.",







    back: "العودة للوحة التحكم", chooseFarm: "اختر المزرعة", chooseHint: "اختر مزرعة لعرض بياناتها المحفوظة.",







    loading: "جاري تحميل المزارع…", noFarms: "لا توجد مزارع",







    noFarmsHint: "أنشئ مزرعة من صفحة استكشاف المزرعة لبدء ملفها الرقمي.",







    retry: "إعادة المحاولة", overview: "نظرة عامة على المزرعة", area: "مساحة المزرعة",







    soil: "نوع التربة", crop: "المحصول الحالي", location: "الموقع", coordinates: "الإحداثيات",







    notSet: "غير محدد", model: "ملف المزرعة", operations: "أدوات التخطيط",







    water: "تخطيط المياه", waterText: "افتح WaterWise لتقدير الري باستخدام بيانات الطقس المتاحة.",







    rotation: "دورة المحاصيل", rotationText: "راجع توصيات تدوير المحاصيل والخطط المحفوظة.",







    soilHealth: "صحة التربة", soilText: "راجع التقييم الإرشادي بناءً على القيم التي تدخلها.",







    climate: "المناخ", climateText: "راجع الطقس المحلي عند توفر إحداثيات المزرعة.",







    open: "عرض التفاصيل", close: "إغلاق", detailsTitle: "تفاصيل الأداة", dataStatus: "توفر البيانات", savedProfile: "ملف المزرعة المحفوظ",







    saved: "متاح", liveSensors: "بيانات حساسات مباشرة", notConnected: "غير متصلة",







    disclaimerTitle: "عن التوأم الرقمي",







    disclaimer: "تعتمد الصفحة على بيانات المزرعة المحفوظة فقط. لا تعرض قراءات حساسات مباشرة أو صور أقمار صناعية أو نموذجًا ثلاثي الأبعاد حقيقيًا.",







    error: "تعذر تحميل المزارع. تأكد من تشغيل الـ Backend.",







    hectares: "هكتار", latitude: "خط العرض", longitude: "خط الطول",







  },







} as const;















function soilName(value: string, language: Language): string {







  const labels: Record<string, { ar: string; en: string }> = {







    clay: { ar: "طينية", en: "Clay" },







    sandy: { ar: "رملية", en: "Sandy" },







    loamy: { ar: "طميية", en: "Loamy" },







    silty: { ar: "غرينية", en: "Silty" },







    other: { ar: "أخرى", en: "Other" },







  };







  return labels[value]?.[language] ?? (value || text[language].notSet);







}















export default function DigitalTwin({ language, onBack }: Props) {







  const t = text[language];



  const toolDetails = {



    waterwise: { title: t.water, description: t.waterText },



    rotation: { title: t.rotation, description: t.rotationText },



    soilguardian: { title: t.soilHealth, description: t.soilText },



    climate: { title: t.climate, description: t.climateText },



  } as const;







  const [farms, setFarms] = useState<Farm[]>([]);







  const [farmId, setFarmId] = useState<number | "">("");







  const [loading, setLoading] = useState(true);







  const [error, setError] = useState("");



  const [selectedTool, setSelectedTool] = useState<"waterwise" | "rotation" | "soilguardian" | "climate" | null>(null);















  const farm = useMemo(







    () => farms.find((item) => item.id === farmId) ?? null,







    [farms, farmId]







  );















  async function loadFarms() {







    setLoading(true);







    setError("");







    try {







      const data = await getFarms();







      setFarms(data);







      setFarmId((current) =>







        current !== "" && data.some((item) => item.id === current)







          ? current







          : data[0]?.id ?? ""







      );







    } catch (cause) {







      console.error("Digital Twin: failed to load farms", cause);







      setError(cause instanceof Error ? cause.message : t.error);







    } finally {







      setLoading(false);







    }







  }















  useEffect(() => {







    void loadFarms();







  }, []);



return (







    <main className="digital-twin-page" dir={language === "ar" ? "rtl" : "ltr"}>







      <div className="dt-container">







        <header className="dt-hero">







          <div className="dt-hero-copy">







            <span className="dt-eyebrow"><i />{t.eyebrow}</span>







            <h1>{t.title}</h1>







            <p>{t.subtitle}</p>







            {onBack && <button type="button" className="dt-back" onClick={onBack}>← {t.back}</button>}







          </div>







          <div className="dt-hero-art" aria-hidden="true">







            <span className="dt-orbit dt-orbit-one" />







            <span className="dt-orbit dt-orbit-two" />







            <span className="dt-hero-icon">🌍</span>







            <small>FARM PROFILE · CONNECTED DATA</small>







          </div>







        </header>















        <section className="dt-farm-select">







          <span className="dt-select-icon">🌾</span>







          <div className="dt-select-copy">







            <label htmlFor="dt-farm">{t.chooseFarm}</label>







            <span>{t.chooseHint}</span>







          </div>







          <select id="dt-farm" value={farmId} disabled={loading || farms.length === 0} onChange={(event) => setFarmId(event.target.value ? Number(event.target.value) : "")}>







            {farms.length === 0 && <option value="">{loading ? t.loading : t.noFarms}</option>}







            {farms.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.location}</option>)}







          </select>







        </section>















        {loading ? (







          <section className="dt-state"><span className="dt-spinner" /><p>{t.loading}</p></section>







        ) : error ? (







          <section className="dt-error" role="alert"><p>{error}</p><button type="button" onClick={() => void loadFarms()}>{t.retry}</button></section>







        ) : farms.length === 0 ? (







          <section className="dt-state"><span className="dt-empty-icon">🌱</span><h2>{t.noFarms}</h2><p>{t.noFarmsHint}</p></section>







        ) : farm ? (







          <>







            <section className="dt-section">







              <div className="dt-section-heading">







                <div><span className="dt-kicker">REGISTERED FARM DATA</span><h2>{t.overview}</h2></div>







                <span className="dt-id">FARM #{farm.id}</span>







              </div>







              <div className="dt-profile-grid">







                <article className="dt-profile-card">







                  <div className="dt-profile-top"><span className="dt-profile-icon">🗺️</span><span className="dt-data-badge"><i />{t.saved}</span></div>







                  <small>{t.model}</small><h3>{farm.name}</h3><p>{farm.location || t.notSet}</p>







                  <div className="dt-divider" />







                  <div className="dt-profile-facts">







                    <div><span>{t.area}</span><strong>{farm.area_hectares.toLocaleString(language === "ar" ? "ar-EG" : "en-US")} {t.hectares}</strong></div>







                    <div><span>{t.soil}</span><strong>{soilName(farm.soil_type, language)}</strong></div>







                    <div><span>{t.crop}</span><strong>{farm.current_crop || t.notSet}</strong></div>







                  </div>







                </article>







                <article className="dt-map-card">







                  <div className="dt-map-art" aria-hidden="true"><span className="dt-map-grid" /><span className="dt-map-plot plot-a" /><span className="dt-map-plot plot-b" /><span className="dt-map-plot plot-c" /><span className="dt-map-pin">⌖</span></div>







                  <div className="dt-map-details"><strong>{t.coordinates}</strong>{farm.latitude != null && farm.longitude != null ? <p>{t.latitude}: {farm.latitude}<br />{t.longitude}: {farm.longitude}</p> : <p>{t.notSet}</p>}</div>







                  <span className={`dt-coordinate-status ${farm.latitude != null && farm.longitude != null ? "is-ready" : "is-missing"}`}>{farm.latitude != null && farm.longitude != null ? (language === "ar" ? "إحداثيات محفوظة" : "Coordinates saved") : (language === "ar" ? "الإحداثيات غير متاحة" : "Coordinates unavailable")}</span>







                </article>







              </div>







            </section>















            <section className="dt-section">







              <div className="dt-section-heading"><div><span className="dt-kicker">CONNECTED WORKFLOWS</span><h2>{t.operations}</h2></div></div>







              <div className="dt-workflow-grid">







                <article className="dt-workflow-card"><span className="dt-workflow-icon dt-water">💧</span><h3>{t.water}</h3><p>{t.waterText}</p><button type="button" onClick={() => setSelectedTool("waterwise")}>{t.open} ↗</button></article>







                <article className="dt-workflow-card"><span className="dt-workflow-icon dt-rotation">🌱</span><h3>{t.rotation}</h3><p>{t.rotationText}</p><button type="button" onClick={() => setSelectedTool("rotation")}>{t.open} ↗</button></article>







                <article className="dt-workflow-card"><span className="dt-workflow-icon dt-soil">🪨</span><h3>{t.soilHealth}</h3><p>{t.soilText}</p><button type="button" onClick={() => setSelectedTool("soilguardian")}>{t.open} ↗</button></article>







                <article className="dt-workflow-card"><span className="dt-workflow-icon dt-climate">🌦️</span><h3>{t.climate}</h3><p>{t.climateText}</p><button type="button" onClick={() => setSelectedTool("climate")}>{t.open} ↗</button></article>







              </div>







            </section>















            <section className="dt-section">







              <div className="dt-section-heading"><div><span className="dt-kicker">DATA CONNECTIONS</span><h2>{t.dataStatus}</h2></div></div>







              <div className="dt-status-grid">







                <article><span className="dt-status-symbol">✓</span><div><strong>{t.savedProfile}</strong><small>{t.saved}</small></div></article>







                <article><span className="dt-status-symbol dt-status-off">○</span><div><strong>{t.liveSensors}</strong><small>{t.notConnected}</small></div></article>







              </div>







            </section>







          </>







        ) : null}















        {selectedTool && (
          <div
            className="dt-details-backdrop"
            role="presentation"
            onClick={() => setSelectedTool(null)}
          >
            <section
              className="dt-details-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="dt-details-title"
              dir={language === "ar" ? "rtl" : "ltr"}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="dt-details-header">
                <div>
                  <span className="dt-kicker">{t.detailsTitle}</span>
                  <h2 id="dt-details-title">{toolDetails[selectedTool].title}</h2>
                </div>
                <button
                  type="button"
                  className="dt-details-close"
                  aria-label={t.close}
                  onClick={() => setSelectedTool(null)}
                >
                  ×
                </button>
              </div>
              <p>{toolDetails[selectedTool].description}</p>
              <div className="dt-details-actions">
                <button type="button" onClick={() => setSelectedTool(null)}>
                  {t.close}
                </button>
              </div>
            </section>
          </div>
        )}

        <aside className="dt-disclaimer"><span>ℹ️</span><div><strong>{t.disclaimerTitle}</strong><p>{t.disclaimer}</p></div></aside>







        <footer className="dt-footer"><span><i /> TERRASHIFT AI · DIGITAL TWIN</span><span>FARM DATA OVERVIEW</span></footer>







      </div>







    </main>







  );







}
