import { useEffect, useMemo, useState } from "react";
import { getFarms, type Farm } from "../services/farms";
import "../styles/SoilGuardian.css";

type Language = "ar" | "en";
type Props = { language: Language; onBack?: () => void };

type SoilInputs = {
  ph: number;
  moisture: number;
  organicMatter: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
};

type Finding = {
  level: "good" | "warning" | "critical";
  title: string;
  detail: string;
};

const labels = {
  en: {
    eyebrow: "SOIL HEALTH INTELLIGENCE",
    title: "Soil Guardian",
    subtitle: "Understand your soil indicators and get practical, data-informed steps to improve soil health.",
    back: "Back",
    farm: "Select farm",
    farmHint: "Choose a registered farm to connect this assessment to its profile.",
    loading: "Loading farms…",
    noFarms: "No farms found",
    noFarmsHint: "Add a farm in Farm Explorer, then return here.",
    retry: "Try again",
    profile: "Farm profile",
    area: "Farm area",
    soilType: "Registered soil type",
    crop: "Current crop",
    assessment: "Soil indicators",
    assessmentHint: "Enter recent soil-test results. These values are user-provided, not measured by this page.",
    ph: "Soil pH",
    moisture: "Soil moisture",
    organic: "Organic matter",
    nitrogen: "Nitrogen (N)",
    phosphorus: "Phosphorus (P)",
    potassium: "Potassium (K)",
    percent: "%",
    mgkg: "mg/kg",
    analyze: "Assess soil health",
    reset: "Reset values",
    results: "Assessment results",
    resultHint: "Rule-based screening using the values you entered.",
    score: "Indicator score",
    status: "Overall status",
    good: "Within target range",
    warning: "Needs attention",
    critical: "Priority action",
    findings: "Findings & actions",
    empty: "Enter your soil-test values and select Assess soil health to see the results.",
    caveatTitle: "Important note",
    caveat: "This is an educational screening, not a laboratory diagnosis or fertilizer prescription. Suitable ranges vary by crop, soil texture, climate and lab method. Confirm decisions with a local agronomist and a current soil test.",
    phLow: "Soil pH is on the acidic side.",
    phHigh: "Soil pH is on the alkaline side.",
    phOk: "Soil pH is in a broadly suitable range for many crops.",
    moistureLow: "Reported soil moisture is low; check moisture at root depth before irrigating.",
    moistureHigh: "Reported soil moisture is high; check drainage and avoid waterlogging.",
    moistureOk: "Reported soil moisture is in the selected screening range.",
    organicLow: "Organic matter is low. Consider locally suitable compost or cover crops after checking salinity and maturity.",
    organicOk: "Organic matter is in the selected screening range.",
    nLow: "Nitrogen value is low against this general screening threshold. Confirm crop stage and lab units before applying nutrients.",
    nOk: "Nitrogen value meets this general screening threshold.",
    pLow: "Phosphorus value is low against this general screening threshold. Use local soil-test recommendations before adding phosphorus.",
    pOk: "Phosphorus value meets this general screening threshold.",
    kLow: "Potassium value is low against this general screening threshold. Confirm the test method and crop needs.",
    kOk: "Potassium value meets this general screening threshold.",
    improve: "Suggested next steps",
    step1: "Use a recent laboratory soil test and confirm the units for N, P and K.",
    step2: "Track the same indicators over time and compare samples from similar depths and locations.",
    step3: "Avoid applying fertilizer based only on this screening; follow crop-specific local recommendations.",
    soilClay: "Clay",
    soilSandy: "Sandy",
    soilLoamy: "Loamy",
    soilSilty: "Silty",
    soilOther: "Other / unspecified",
    notSet: "Not specified",
    error: "Could not load farms. Check that the backend is running.",
  },
  ar: {
    eyebrow: "ذكاء صحة التربة",
    title: "Soil Guardian — حارس التربة",
    subtitle: "افهم مؤشرات التربة واحصل على خطوات عملية لتحسين صحتها بناءً على البيانات المدخلة.",
    back: "رجوع",
    farm: "اختر المزرعة",
    farmHint: "اختر مزرعة مسجلة لربط التقييم ببياناتها.",
    loading: "جاري تحميل المزارع…",
    noFarms: "لا توجد مزارع",
    noFarmsHint: "أضف مزرعة من صفحة استكشاف المزارع ثم ارجع هنا.",
    retry: "إعادة المحاولة",
    profile: "بيانات المزرعة",
    area: "مساحة المزرعة",
    soilType: "نوع التربة المسجل",
    crop: "المحصول الحالي",
    assessment: "مؤشرات التربة",
    assessmentHint: "أدخل نتائج تحليل حديثة. القيم هنا من إدخالك وليست قياسات مباشرة من الصفحة.",
    ph: "درجة حموضة التربة pH",
    moisture: "رطوبة التربة",
    organic: "المادة العضوية",
    nitrogen: "النيتروجين (N)",
    phosphorus: "الفوسفور (P)",
    potassium: "البوتاسيوم (K)",
    percent: "%",
    mgkg: "ملجم/كجم",
    analyze: "تقييم صحة التربة",
    reset: "إعادة ضبط القيم",
    results: "نتائج التقييم",
    resultHint: "فحص إرشادي مبني على القيم التي أدخلتها.",
    score: "مؤشر التقييم",
    status: "الحالة العامة",
    good: "ضمن النطاق المستهدف",
    warning: "يحتاج إلى متابعة",
    critical: "أولوية للتحقق",
    findings: "الملاحظات والإجراءات",
    empty: "أدخل نتائج تحليل التربة واضغط «تقييم صحة التربة» لعرض النتائج.",
    caveatTitle: "ملاحظة مهمة",
    caveat: "هذا فحص إرشادي تعليمي وليس تشخيصًا معمليًا أو توصية تسميد. تختلف النطاقات المناسبة حسب المحصول ونوع التربة والمناخ وطريقة التحليل. راجع مختصًا زراعيًا محليًا ونتائج تحليل حديثة قبل اتخاذ القرار.",
    phLow: "درجة الحموضة تميل إلى الحموضة.",
    phHigh: "درجة الحموضة تميل إلى القلوية.",
    phOk: "درجة الحموضة ضمن نطاق مناسب بشكل عام لكثير من المحاصيل.",
    moistureLow: "رطوبة التربة المدخلة منخفضة؛ تحقق من الرطوبة عند عمق الجذور قبل الري.",
    moistureHigh: "رطوبة التربة المدخلة مرتفعة؛ افحص الصرف وتجنب التغريق.",
    moistureOk: "رطوبة التربة ضمن النطاق المستخدم في هذا الفحص الإرشادي.",
    organicLow: "المادة العضوية منخفضة. يمكن دراسة إضافة كمبوست مناسب أو محاصيل تغطية بعد التأكد من الملوحة والنضج.",
    organicOk: "المادة العضوية ضمن النطاق المستخدم في هذا الفحص.",
    nLow: "قيمة النيتروجين منخفضة وفق حد الفحص العام. تأكد من مرحلة نمو المحصول ووحدة المعمل قبل الإضافة.",
    nOk: "قيمة النيتروجين تحقق حد الفحص العام.",
    pLow: "قيمة الفوسفور منخفضة وفق حد الفحص العام. اتبع توصيات تحليل التربة المحلي قبل الإضافة.",
    pOk: "قيمة الفوسفور تحقق حد الفحص العام.",
    kLow: "قيمة البوتاسيوم منخفضة وفق حد الفحص العام. تأكد من طريقة التحليل واحتياجات المحصول.",
    kOk: "قيمة البوتاسيوم تحقق حد الفحص العام.",
    improve: "الخطوات المقترحة",
    step1: "استخدم تحليل تربة معمليًا حديثًا وتأكد من وحدات N وP وK.",
    step2: "تابع المؤشرات نفسها بمرور الوقت وقارن عينات من أعماق ومواقع متشابهة.",
    step3: "لا تضف الأسمدة اعتمادًا على هذا الفحص وحده؛ اتبع توصيات محلية خاصة بالمحصول.",
    soilClay: "طينية",
    soilSandy: "رملية",
    soilLoamy: "طميية",
    soilSilty: "غرينية",
    soilOther: "أخرى / غير محددة",
    notSet: "غير محدد",
    error: "تعذر تحميل المزارع. تأكد من تشغيل الـ Backend.",
  },
} as const;

function soilName(value: string, t: typeof labels.en | typeof labels.ar) {
  const names: Record<string, keyof typeof labels.en> = {
    clay: "soilClay",
    sandy: "soilSandy",
    loamy: "soilLoamy",
    silty: "soilSilty",
    other: "soilOther",
  };
  return names[value] ? t[names[value]] : t.soilOther;
}

const defaults: SoilInputs = {
  ph: 6.8,
  moisture: 30,
  organicMatter: 3,
  nitrogen: 40,
  phosphorus: 15,
  potassium: 120,
};

export default function SoilGuardian({ language, onBack }: Props) {
  const t = labels[language];
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmId, setFarmId] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [inputs, setInputs] = useState<SoilInputs>(defaults);
  const [assessed, setAssessed] = useState(false);

  const farm = useMemo(() => farms.find((item) => item.id === farmId) ?? null, [farms, farmId]);

  async function loadFarms() {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getFarms();
      setFarms(data);
      setFarmId((current) => current !== "" && data.some((item) => item.id === current) ? current : (data[0]?.id ?? ""));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFarms();
  }, []);

  const findings = useMemo<Finding[]>(() => {
    if (!assessed) return [];
    const list: Finding[] = [];
    const add = (level: Finding["level"], title: string, detail: string) => list.push({ level, title, detail });

    if (inputs.ph < 5.5) add("critical", t.ph, t.phLow);
    else if (inputs.ph > 7.8) add("warning", t.ph, t.phHigh);
    else add("good", t.ph, t.phOk);

    if (inputs.moisture < 15) add("warning", t.moisture, t.moistureLow);
    else if (inputs.moisture > 65) add("warning", t.moisture, t.moistureHigh);
    else add("good", t.moisture, t.moistureOk);

    if (inputs.organicMatter < 2) add("warning", t.organic, t.organicLow);
    else add("good", t.organic, t.organicOk);

    if (inputs.nitrogen < 20) add("warning", t.nitrogen, t.nLow);
    else add("good", t.nitrogen, t.nOk);

    if (inputs.phosphorus < 10) add("warning", t.phosphorus, t.pLow);
    else add("good", t.phosphorus, t.pOk);

    if (inputs.potassium < 80) add("warning", t.potassium, t.kLow);
    else add("good", t.potassium, t.kOk);

    return list;
  }, [assessed, inputs, t]);

  const score = findings.length ? Math.round((findings.filter((item) => item.level === "good").length / findings.length) * 100) : 0;
  const overall = findings.some((item) => item.level === "critical") ? "critical" : findings.some((item) => item.level === "warning") ? "warning" : "good";

  function update<K extends keyof SoilInputs>(key: K, value: number) {
    setInputs((current) => ({ ...current, [key]: value }));
    setAssessed(false);
  }

  function reset() {
    setInputs(defaults);
    setAssessed(false);
  }

  return (
    <main className="soil-guardian-page" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="sg-container">
        <header className="sg-hero">
          <div className="sg-hero-copy">
            <span className="sg-eyebrow"><i />{t.eyebrow}</span>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
            {onBack && <button type="button" className="sg-back" onClick={onBack}>← {t.back}</button>}
          </div>
          <div className="sg-hero-art" aria-hidden="true">
            <span className="sg-orbit sg-orbit-a" />
            <span className="sg-orbit sg-orbit-b" />
            <span className="sg-hero-emoji">🌱</span>
            <small>HEALTHY SOIL · HEALTHY FUTURE</small>
          </div>
        </header>

        <section className="sg-farm-picker">
          <span className="sg-picker-icon">🌾</span>
          <div className="sg-picker-copy">
            <label htmlFor="sg-farm">{t.farm}</label>
            <span>{t.farmHint}</span>
          </div>
          <select id="sg-farm" value={farmId} disabled={loading || farms.length === 0} onChange={(event) => setFarmId(event.target.value ? Number(event.target.value) : "")}>
            {farms.length === 0 && <option value="">{loading ? t.loading : t.noFarms}</option>}
            {farms.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.location}</option>)}
          </select>
        </section>

        {loading ? (
          <section className="sg-state"><span className="sg-spinner" /><p>{t.loading}</p></section>
        ) : loadError ? (
          <section className="sg-error" role="alert"><p>{t.error}</p><button type="button" onClick={() => void loadFarms()}>{t.retry}</button></section>
        ) : farms.length === 0 ? (
          <section className="sg-state"><span className="sg-empty">🌿</span><h2>{t.noFarms}</h2><p>{t.noFarmsHint}</p></section>
        ) : farm ? (
          <>
            <section className="sg-section">
              <div className="sg-section-heading">
                <div><span className="sg-kicker">FARM PROFILE</span><h2>{t.profile}</h2></div>
                <span className="sg-tag">#{farm.id} · {farm.name}</span>
              </div>
              <div className="sg-profile-grid">
                <article className="sg-card sg-profile-card"><span className="sg-icon sg-green">📍</span><small>{t.farm}</small><h3>{farm.name}</h3><div className="sg-divider" /><div className="sg-meta"><span>{t.area}</span><strong>{farm.area_hectares.toLocaleString(language === "ar" ? "ar-EG" : "en-US")} {language === "ar" ? "هكتار" : "ha"}</strong></div></article>
                <article className="sg-card sg-profile-card"><span className="sg-icon sg-orange">🪨</span><small>{t.soilType}</small><h3>{soilName(farm.soil_type, t)}</h3><div className="sg-divider" /><div className="sg-meta"><span>{t.crop}</span><strong>{farm.current_crop || t.notSet}</strong></div></article>
              </div>
            </section>

            <section className="sg-section">
              <div className="sg-section-heading"><div><span className="sg-kicker">SOIL TEST INPUTS</span><h2>{t.assessment}</h2><p>{t.assessmentHint}</p></div></div>
              <div className="sg-input-grid">
                <label className="sg-input-card"><span>🧪 {t.ph}</span><strong>{inputs.ph.toFixed(1)}</strong><input type="range" min="3" max="10" step="0.1" value={inputs.ph} onChange={(e) => update("ph", Number(e.target.value))} /><small>3.0 — 10.0</small></label>
                <label className="sg-input-card"><span>💧 {t.moisture}</span><strong>{inputs.moisture}{t.percent}</strong><input type="range" min="0" max="100" step="1" value={inputs.moisture} onChange={(e) => update("moisture", Number(e.target.value))} /><small>0 — 100{t.percent}</small></label>
                <label className="sg-input-card"><span>🍂 {t.organic}</span><strong>{inputs.organicMatter.toFixed(1)}{t.percent}</strong><input type="range" min="0" max="10" step="0.1" value={inputs.organicMatter} onChange={(e) => update("organicMatter", Number(e.target.value))} /><small>0 — 10{t.percent}</small></label>
                <label className="sg-input-card"><span>🌿 {t.nitrogen}</span><strong>{inputs.nitrogen} {t.mgkg}</strong><input type="range" min="0" max="150" step="1" value={inputs.nitrogen} onChange={(e) => update("nitrogen", Number(e.target.value))} /><small>0 — 150 {t.mgkg}</small></label>
                <label className="sg-input-card"><span>🧬 {t.phosphorus}</span><strong>{inputs.phosphorus} {t.mgkg}</strong><input type="range" min="0" max="100" step="1" value={inputs.phosphorus} onChange={(e) => update("phosphorus", Number(e.target.value))} /><small>0 — 100 {t.mgkg}</small></label>
                <label className="sg-input-card"><span>⚡ {t.potassium}</span><strong>{inputs.potassium} {t.mgkg}</strong><input type="range" min="0" max="300" step="5" value={inputs.potassium} onChange={(e) => update("potassium", Number(e.target.value))} /><small>0 — 300 {t.mgkg}</small></label>
              </div>
              <div className="sg-form-actions"><button type="button" className="sg-primary" onClick={() => setAssessed(true)}>{t.analyze}</button><button type="button" className="sg-secondary" onClick={reset}>{t.reset}</button></div>
            </section>

            <section className="sg-section">
              <div className="sg-section-heading"><div><span className="sg-kicker">ASSESSMENT SUMMARY</span><h2>{t.results}</h2><p>{t.resultHint}</p></div></div>
              {!assessed ? <div className="sg-state sg-state-inline"><span className="sg-empty">🧭</span><p>{t.empty}</p></div> : (
                <>
                  <div className="sg-result-summary">
                    <div className="sg-score-ring" style={{ "--sg-score": `${score}%` } as React.CSSProperties}><div><strong>{score}%</strong><small>{t.score}</small></div></div>
                    <div className="sg-summary-copy"><span className={`sg-status sg-status-${overall}`}>{overall === "good" ? t.good : overall === "warning" ? t.warning : t.critical}</span><h3>{t.status}</h3><p>{findings.filter((item) => item.level !== "good").length} / {findings.length} {language === "ar" ? "مؤشرات تحتاج إلى متابعة" : "indicators need attention"}</p></div>
                  </div>
                  <div className="sg-findings-grid">
                    {findings.map((item, index) => <article className={`sg-finding sg-finding-${item.level}`} key={`${item.title}-${index}`}><span className="sg-finding-mark">{item.level === "good" ? "✓" : item.level === "critical" ? "!" : "↗"}</span><div><strong>{item.title}</strong><p>{item.detail}</p></div></article>)}
                  </div>
                  <div className="sg-next-steps"><h3>{t.improve}</h3><p><span>01</span>{t.step1}</p><p><span>02</span>{t.step2}</p><p><span>03</span>{t.step3}</p></div>
                </>
              )}
            </section>

            <aside className="sg-disclaimer"><span>ℹ️</span><div><strong>{t.caveatTitle}</strong><p>{t.caveat}</p></div></aside>
          </>
        ) : null}
        <footer className="sg-footer"><span><i /> TERRASHIFT AI · SOIL GUARDIAN</span><span>DATA-INFORMED SOIL CARE</span></footer>
      </div>
    </main>
  );
}
