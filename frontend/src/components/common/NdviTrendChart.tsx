
import { useEffect, useState } from "react";
import {
  getFarmNdviStatistics,
  type NdviObservation,
} from "../../services/satellite";

type Language = "ar" | "en";

interface NdviTrendChartProps {
  farmId: number | null;
  language: Language;
}

interface ChartPoint {
  date: string;
  value: number;
}

const translations = {
  en: {
    title: "Vegetation Health Trend",
    subtitle: "Satellite NDVI observations over time",
    loading: "Loading NDVI observations...",
    noFarm: "Select a farm to view its NDVI trend.",
    noData: "No valid NDVI observations are available for this period.",
    error: "Could not load NDVI observations.",
    retry: "Retry",
    mean: "Mean NDVI",
    min: "Minimum",
    max: "Maximum",
    observations: "Observations",
    source: "Source",
    period: "Last 90 days",
    low: "Low vegetation signal",
    moderate: "Moderate vegetation signal",
    high: "High vegetation signal",
    disclaimer:
      "NDVI indicates vegetation greenness. Interpret changes in the context of crop type, growth stage, weather, and field conditions.",
  },
  ar: {
    title: "تطور صحة الغطاء النباتي",
    subtitle: "قراءات NDVI من الأقمار الصناعية بمرور الوقت",
    loading: "جارٍ تحميل قراءات NDVI...",
    noFarm: "اختر مزرعة لعرض تطور NDVI الخاص بها.",
    noData: "لا توجد قراءات NDVI صالحة خلال هذه الفترة.",
    error: "تعذر تحميل قراءات NDVI.",
    retry: "إعادة المحاولة",
    mean: "متوسط NDVI",
    min: "الحد الأدنى",
    max: "الحد الأقصى",
    observations: "عدد القراءات",
    source: "المصدر",
    period: "آخر 90 يومًا",
    low: "إشارة نباتية منخفضة",
    moderate: "إشارة نباتية متوسطة",
    high: "إشارة نباتية مرتفعة",
    disclaimer:
      "يعكس NDVI درجة اخضرار الغطاء النباتي. يجب تفسير التغيّرات وفق نوع المحصول ومرحلة نموه والطقس وظروف الحقل.",
  },
} as const;

function getDateDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(date: string, language: Language): string {
  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat(
    language === "ar" ? "ar-EG" : "en",
    {
      day: "numeric",
      month: "short",
    },
  ).format(parsed);
}

export default function NdviTrendChart({
  farmId,
  language,
}: NdviTrendChartProps) {
  const t = translations[language];
  const isArabic = language === "ar";

  const [observations, setObservations] = useState<NdviObservation[]>([]);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadObservations() {
    if (!farmId) {
      setObservations([]);
      setSource("");
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await getFarmNdviStatistics(
        farmId,
        getDateDaysAgo(90),
        getDateDaysAgo(0),
        { maxCloudCoverage: 30 },
      );

      setObservations(result.observations ?? []);
      setSource(result.source ?? "");
    } catch {
      setError(t.error);
      setObservations([]);
      setSource("");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadObservations();
    // Reload when the selected farm changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmId]);

  const points: ChartPoint[] = observations
    .filter(
      (item): item is NdviObservation & { date: string } =>
        typeof item.date === "string" &&
        item.date.length > 0 &&
        Number.isFinite(item.mean_ndvi),
    )
    .map((item) => ({
      date: item.date,
      value: item.mean_ndvi,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const latest = points.length > 0 ? points[points.length - 1] : null;

  const minimum =
    points.length > 0
      ? Math.min(0, ...points.map((point) => point.value))
      : 0;

  const maximum =
    points.length > 0
      ? Math.max(1, ...points.map((point) => point.value))
      : 1;

  const range = maximum - minimum || 1;

  const chartWidth = 720;
  const chartHeight = 250;
  const paddingLeft = 42;
  const paddingRight = 18;
  const paddingTop = 20;
  const paddingBottom = 38;

  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const xFor = (index: number) =>
    points.length <= 1
      ? paddingLeft + plotWidth / 2
      : paddingLeft + (index / (points.length - 1)) * plotWidth;

  const yFor = (value: number) =>
    paddingTop + ((maximum - value) / range) * plotHeight;

  const linePath = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${xFor(index)} ${yFor(point.value)}`,
    )
    .join(" ");

  const areaPath =
    points.length > 1
      ? `${linePath} L ${xFor(points.length - 1)} ${paddingTop + plotHeight} L ${xFor(0)} ${paddingTop + plotHeight} Z`
      : "";

  const latestColor =
    latest && latest.value < 0.3
      ? "#dc2626"
      : latest && latest.value < 0.6
        ? "#ca8a04"
        : "#16a34a";

  const panelStyle: React.CSSProperties = {
    background: "var(--card-bg, #ffffff)",
    color: "var(--text-primary, #172033)",
    border: "1px solid var(--border-color, #e5e7eb)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  };

  return (
    <section
      style={panelStyle}
      dir={isArabic ? "rtl" : "ltr"}
      aria-busy={loading}
    >
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 6px", fontSize: 19 }}>
            {t.title}
          </h2>
          <p
            style={{
              margin: 0,
              color: "var(--text-secondary, #64748b)",
              fontSize: 13,
            }}
          >
            {t.subtitle}
          </p>
        </div>

        <span
          style={{
            borderRadius: 20,
            padding: "6px 10px",
            background: "var(--badge-bg, #f1f5f9)",
            fontSize: 12,
          }}
        >
          {t.period}
        </span>
      </header>

      {!farmId ? (
        <p style={{ color: "var(--text-secondary, #64748b)" }}>
          {t.noFarm}
        </p>
      ) : loading ? (
        <p role="status">{t.loading}</p>
      ) : error ? (
        <div role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void loadObservations()}
            style={{
              border: 0,
              borderRadius: 8,
              padding: "9px 12px",
              cursor: "pointer",
              background: "#2563eb",
              color: "#ffffff",
            }}
          >
            {t.retry}
          </button>
        </div>
      ) : points.length === 0 ? (
        <p style={{ color: "var(--text-secondary, #64748b)" }}>
          {t.noData}
        </p>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                border: "1px solid var(--border-color, #e5e7eb)",
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div
                style={{
                  color: "var(--text-secondary, #64748b)",
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                {t.mean}
              </div>
              <strong style={{ fontSize: 23, color: latestColor }}>
                {latest?.value.toFixed(3)}
              </strong>
              <div
                style={{
                  color: "var(--text-secondary, #64748b)",
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                {latest ? formatDate(latest.date, language) : ""}
              </div>
            </div>

            <div
              style={{
                border: "1px solid var(--border-color, #e5e7eb)",
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div
                style={{
                  color: "var(--text-secondary, #64748b)",
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                {t.observations}
              </div>
              <strong style={{ fontSize: 23 }}>{points.length}</strong>
            </div>
          </div>

          <div style={{ width: "100%", overflowX: "auto" }}>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              role="img"
              aria-label={t.title}
              style={{
                display: "block",
                width: "100%",
                minWidth: 320,
                maxHeight: 340,
              }}
            >
              {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                const value = maximum - fraction * range;
                const y = paddingTop + fraction * plotHeight;

                return (
                  <g key={fraction}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={chartWidth - paddingRight}
                      y2={y}
                      stroke="var(--border-color, #e5e7eb)"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 4}
                      fontSize="11"
                      textAnchor="end"
                      fill="var(--text-secondary, #64748b)"
                    >
                      {value.toFixed(2)}
                    </text>
                  </g>
                );
              })}

              {areaPath && (
                <path
                  d={areaPath}
                  fill="#16a34a"
                  fillOpacity={0.12}
                />
              )}

              {points.length > 1 && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}

              {points.map((point, index) => (
                <g key={`${point.date}-${index}`}>
                  <circle
                    cx={xFor(index)}
                    cy={yFor(point.value)}
                    r={points.length > 30 ? 2.5 : 4}
                    fill="#16a34a"
                    stroke="var(--card-bg, #ffffff)"
                    strokeWidth="1.5"
                  >
                    <title>
                      {`${formatDate(point.date, language)}: ${point.value.toFixed(3)}`}
                    </title>
                  </circle>
                </g>
              ))}

              {points.length > 0 && (
                <>
                  <text
                    x={paddingLeft}
                    y={chartHeight - 10}
                    fontSize="11"
                    textAnchor="start"
                    fill="var(--text-secondary, #64748b)"
                  >
                    {formatDate(points[0].date, language)}
                  </text>
                  <text
                    x={chartWidth - paddingRight}
                    y={chartHeight - 10}
                    fontSize="11"
                    textAnchor="end"
                    fill="var(--text-secondary, #64748b)"
                  >
                    {formatDate(points[points.length - 1].date, language)}
                  </text>
                </>
              )}
            </svg>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 14,
              fontSize: 12,
              color: "var(--text-secondary, #64748b)",
            }}
          >
            <span>🟢 {t.high}: NDVI ≥ 0.6</span>
            <span>🟡 {t.moderate}: 0.3–0.59</span>
            <span>🔴 {t.low}: NDVI &lt; 0.3</span>
          </div>

          {source && (
            <p
              style={{
                fontSize: 12,
                color: "var(--text-secondary, #64748b)",
                marginBottom: 0,
              }}
            >
              {t.source}: {source}
            </p>
          )}
        </>
      )}

      <p
        style={{
          margin: "16px 0 0",
          padding: 12,
          borderRadius: 9,
          background: "var(--notice-bg, #eff6ff)",
          color: "var(--notice-text, #1e40af)",
          fontSize: 12,
          lineHeight: 1.7,
        }}
      >
        {t.disclaimer}
      </p>
    </section>
  );
}
