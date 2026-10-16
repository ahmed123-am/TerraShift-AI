import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

import type { Farm } from "../services/farms";
import {
  getSatelliteImage,
  getFarmNdviStatistics,
  compareFarmNdvi,
} from "../services/satellite";

import type {
  SatelliteImageType,
  SatelliteImageResponse,
  NdviStatisticsResponse,
  NdviComparisonResponse,
} from "../services/satellite";

import "../styles/FarmExplorer.css";

type SatelliteIntelligenceProps = {
  language: "ar" | "en";
  farms: Farm[];
  onBack: () => void;
};

function getDateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatNumber(
  value: number | null | undefined,
  digits = 3,
  language: "ar" | "en" = "en"
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  return value.toLocaleString(language === "ar" ? "ar-EG" : "en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

function getNdviDescription(
  value: number,
  isArabic: boolean
): string {
  if (value < 0) {
    return isArabic
      ? "قيمة سالبة؛ قد تشير إلى مياه أو أسطح غير نباتية."
      : "Negative value; may indicate water or non-vegetated surfaces.";
  }

  if (value < 0.2) {
    return isArabic
      ? "غطاء نباتي قليل أو غير موجود."
      : "Very little or no vegetation.";
  }

  if (value < 0.4) {
    return isArabic
      ? "غطاء نباتي منخفض إلى متوسط."
      : "Low to moderate vegetation.";
  }

  if (value < 0.6) {
    return isArabic
      ? "غطاء نباتي متوسط إلى جيد."
      : "Moderate to good vegetation.";
  }

  return isArabic
    ? "غطاء نباتي كثيف نسبيًا."
    : "Relatively dense vegetation.";
}

export default function SatelliteIntelligence({
  language,
  farms,
  onBack,
}: SatelliteIntelligenceProps) {
  const isArabic = language === "ar";

  const mappedFarms = useMemo(
    () =>
      farms.filter(
        (farm) =>
          farm.latitude !== null &&
          farm.latitude !== undefined &&
          farm.longitude !== null &&
          farm.longitude !== undefined &&
          Number.isFinite(Number(farm.latitude)) &&
          Number.isFinite(Number(farm.longitude))
      ),
    [farms]
  );

  const [selectedFarmId, setSelectedFarmId] = useState<string>(
    mappedFarms[0] ? String(mappedFarms[0].id) : ""
  );

  const [imageType, setImageType] =
    useState<SatelliteImageType>("ndvi");

  const [startDate, setStartDate] = useState(() =>
    getDateOffset(30)
  );

  const [endDate, setEndDate] = useState(() =>
    getDateOffset(0)
  );

  const [firstStartDate, setFirstStartDate] = useState(() =>
    getDateOffset(60)
  );

  const [firstEndDate, setFirstEndDate] = useState(() =>
    getDateOffset(31)
  );

  const [secondStartDate, setSecondStartDate] = useState(() =>
    getDateOffset(30)
  );

  const [secondEndDate, setSecondEndDate] = useState(() =>
    getDateOffset(0)
  );

  const [maxCloudCoverage, setMaxCloudCoverage] = useState(30);

  const [imageResult, setImageResult] =
    useState<SatelliteImageResponse | null>(null);

  const [statisticsResult, setStatisticsResult] =
    useState<NdviStatisticsResponse | null>(null);

  const [comparisonResult, setComparisonResult] =
    useState<NdviComparisonResponse | null>(null);

  const [loadingImage, setLoadingImage] = useState(false);
  const [loadingStatistics, setLoadingStatistics] = useState(false);
  const [loadingComparison, setLoadingComparison] = useState(false);

  const [error, setError] = useState("");

  const selectedFarm = mappedFarms.find(
    (farm) => String(farm.id) === selectedFarmId
  );

  const copy = {
    eyebrow: isArabic
      ? "تحليل الأرض بالاستشعار عن بُعد"
      : "REMOTE SENSING & FIELD ANALYTICS",

    title: isArabic
      ? "ذكاء الأقمار الصناعية"
      : "Satellite Intelligence",

    subtitle: isArabic
      ? "راقب الغطاء النباتي لمزارعك باستخدام صور Sentinel-2 ومؤشر NDVI، وقارن التغيرات بين الفترات الزمنية."
      : "Monitor vegetation using Sentinel-2 imagery and NDVI, then compare changes across different periods.",

    back: isArabic ? "العودة للرئيسية" : "Back to dashboard",

    farm: isArabic ? "اختر المزرعة" : "Select farm",

    chooseFarm: isArabic
      ? "اختر مزرعة محددة جغرافيًا"
      : "Choose a geolocated farm",

    coordinates: isArabic ? "الإحداثيات" : "Coordinates",

    noMappedFarms: isArabic
      ? "لا توجد مزارع بإحداثيات جغرافية"
      : "No geolocated farms available",

    noMappedFarmsHint: isArabic
      ? "أضف خط العرض وخط الطول للمزرعة من صفحة استكشاف المزارع أولًا."
      : "Add the farm's latitude and longitude in Farm Explorer first.",

    imageSection: isArabic
      ? "صور الأقمار الصناعية"
      : "Satellite imagery",

    imageHint: isArabic
      ? "حدد الفترة الزمنية ونوع الصورة."
      : "Choose a date range and image type.",

    startDate: isArabic ? "من تاريخ" : "Start date",

    endDate: isArabic ? "إلى تاريخ" : "End date",

    imageType: isArabic ? "نوع الصورة" : "Image type",

    ndviImage: isArabic ? "مؤشر NDVI" : "NDVI vegetation map",

    trueColor: isArabic ? "ألوان طبيعية" : "True color",

    cloudCoverage: isArabic
      ? "أقصى نسبة تغطية سحابية"
      : "Maximum cloud coverage",

    loadImage: isArabic
      ? "جلب صورة القمر الصناعي"
      : "Fetch satellite image",

    loadingImage: isArabic
      ? "جاري جلب الصورة..."
      : "Fetching satellite image...",

    imagePreview: isArabic ? "معاينة الصورة" : "Image preview",

    noImage: isArabic
      ? "لم يتم جلب صورة بعد."
      : "No satellite image has been fetched yet.",

    realData: isArabic
      ? "بيانات فضائية حقيقية"
      : "Real satellite data",

    notVerified: isArabic
      ? "مصدر البيانات"
      : "Data source",

    areaNote: isArabic
      ? "ملاحظة حول نطاق التحليل"
      : "Analysis area note",

    statistics: isArabic
      ? "تحليل الغطاء النباتي"
      : "Vegetation analytics",

    statisticsHint: isArabic
      ? "اعرض إحصائيات NDVI خلال الفترة المختارة."
      : "Retrieve NDVI statistics for the selected period.",

    loadStatistics: isArabic
      ? "تحليل NDVI"
      : "Analyze NDVI",

    loadingStatistics: isArabic
      ? "جاري تحليل البيانات..."
      : "Analyzing data...",

    mean: isArabic ? "متوسط NDVI" : "Mean NDVI",

    minimum: isArabic ? "أقل قيمة" : "Minimum",

    maximum: isArabic ? "أعلى قيمة" : "Maximum",

    observations: isArabic
      ? "عدد المشاهدات"
      : "Observations",

    observationHistory: isArabic
      ? "سجل المشاهدات"
      : "Observation history",

    observationDate: isArabic ? "التاريخ" : "Date",

    sampleCount: isArabic
      ? "عدد العينات"
      : "Sample count",

    noData: isArabic
      ? "بيانات غير متاحة"
      : "No data",

    noObservations: isArabic
      ? "لا توجد مشاهدات في الفترة المحددة."
      : "No observations are available for this period.",

    comparison: isArabic
      ? "مقارنة زمنية"
      : "Temporal comparison",

    comparisonHint: isArabic
      ? "قارن متوسط NDVI بين فترتين زمنيتين."
      : "Compare average NDVI across two date ranges.",

    firstPeriod: isArabic
      ? "الفترة الأولى"
      : "First period",

    secondPeriod: isArabic
      ? "الفترة الثانية"
      : "Second period",

    compare: isArabic
      ? "مقارنة الفترتين"
      : "Compare periods",

    loadingComparison: isArabic
      ? "جاري المقارنة..."
      : "Comparing periods...",

    change: isArabic ? "التغير في NDVI" : "NDVI change",

    interpretation: isArabic
      ? "تفسير التغير"
      : "Change interpretation",

    source: isArabic ? "المصدر" : "Source",

    disclaimer: isArabic
      ? "ملاحظة: NDVI مؤشر على الغطاء النباتي وليس تشخيصًا مؤكدًا لصحة المحصول. النتائج تتأثر بالسحب وموقع الإحداثيات ودقة نطاق التحليل."
      : "Note: NDVI indicates vegetation conditions, not a definitive crop-health diagnosis. Results depend on clouds, coordinate accuracy, and the analysis footprint.",

    loading: isArabic ? "جاري التحميل..." : "Loading...",

    selectFarmFirst: isArabic
      ? "اختر مزرعة بإحداثيات صحيحة أولًا."
      : "Select a farm with valid coordinates first.",

    invalidDates: isArabic
      ? "تأكد من صحة التواريخ وأن تاريخ البداية لا يأتي بعد تاريخ النهاية."
      : "Check the dates and ensure the start date is not after the end date.",

    invalidComparisonDates: isArabic
      ? "تحقق من صحة تواريخ الفترتين."
      : "Check the dates for both comparison periods.",

    empty: isArabic ? "لا توجد بيانات بعد" : "No data yet",

    emptyHint: isArabic
      ? "اختر المزرعة والفترة الزمنية ثم ابدأ التحليل."
      : "Choose a farm and date range to start the analysis.",

    footer: isArabic
      ? "قرارات زراعية أذكى تبدأ من بيانات دقيقة."
      : "Smarter agricultural decisions start with better data.",
  };

  const panelStyle: CSSProperties = {
    padding: 22,
    border: "1px solid var(--farm-line)",
    borderRadius: 20,
    background: "var(--farm-panel)",
    minWidth: 0,
    marginBottom: 22,
  };

  const labelStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    color: "var(--farm-muted)",
    fontSize: 12,
    fontWeight: 700,
    minWidth: 0,
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    minWidth: 0,
    minHeight: 43,
    padding: "10px 12px",
    border: "1px solid var(--farm-line)",
    borderRadius: 10,
    background: "var(--farm-bg)",
    color: "var(--farm-ink)",
    font: "inherit",
    fontSize: 12,
    colorScheme: "dark",
  };

  function validateFarmAndDates(
    start: string,
    end: string
  ): boolean {
    if (!selectedFarm) {
      setError(copy.selectFarmFirst);
      return false;
    }

    if (!start || !end || start > end || end > getDateOffset(0)) {
      setError(copy.invalidDates);
      return false;
    }

    return true;
  }

  async function handleLoadImage() {
    if (!validateFarmAndDates(startDate, endDate)) return;

    try {
      setLoadingImage(true);
      setError("");

      const result = await getSatelliteImage(
        Number(selectedFarm!.id),
        startDate,
        endDate,
        imageType,
        { maxCloudCoverage }
      );

      setImageResult(result);
    } catch (err) {
      setImageResult(null);
      setError(
        err instanceof Error
          ? err.message
          : isArabic
            ? "تعذر جلب صورة القمر الصناعي."
            : "Could not fetch the satellite image."
      );
    } finally {
      setLoadingImage(false);
    }
  }

  async function handleLoadStatistics() {
    if (!validateFarmAndDates(startDate, endDate)) return;

    try {
      setLoadingStatistics(true);
      setError("");

      const result = await getFarmNdviStatistics(
        Number(selectedFarm!.id),
        startDate,
        endDate,
        { maxCloudCoverage }
      );

      setStatisticsResult(result);
    } catch (err) {
      setStatisticsResult(null);
      setError(
        err instanceof Error
          ? err.message
          : isArabic
            ? "تعذر تحميل إحصائيات NDVI."
            : "Could not load NDVI statistics."
      );
    } finally {
      setLoadingStatistics(false);
    }
  }

  async function handleCompare() {
    if (!selectedFarm) {
      setError(copy.selectFarmFirst);
      return;
    }

    const today = getDateOffset(0);

    const datesAreValid =
      Boolean(firstStartDate) &&
      Boolean(firstEndDate) &&
      Boolean(secondStartDate) &&
      Boolean(secondEndDate) &&
      firstStartDate <= firstEndDate &&
      secondStartDate <= secondEndDate &&
      firstEndDate <= today &&
      secondEndDate <= today;

    if (!datesAreValid) {
      setError(copy.invalidComparisonDates);
      return;
    }

    try {
      setLoadingComparison(true);
      setError("");

      const result = await compareFarmNdvi(
        Number(selectedFarm.id),
        firstStartDate,
        firstEndDate,
        secondStartDate,
        secondEndDate,
        { maxCloudCoverage }
      );

      setComparisonResult(result);
    } catch (err) {
      setComparisonResult(null);
      setError(
        err instanceof Error
          ? err.message
          : isArabic
            ? "تعذرت مقارنة الفترتين."
            : "Could not compare the selected periods."
      );
    } finally {
      setLoadingComparison(false);
    }
  }

  const observations = statisticsResult?.observations ?? [];

  const meanNdvi = observations.length
    ? observations.reduce(
        (sum, observation) => sum + observation.mean_ndvi,
        0
      ) / observations.length
    : null;

  const minimumNdvi = observations.reduce<number | null>(
    (minimum, observation) =>
      observation.min_ndvi === null
        ? minimum
        : minimum === null
          ? observation.min_ndvi
          : Math.min(minimum, observation.min_ndvi),
    null
  );

  const maximumNdvi = observations.reduce<number | null>(
    (maximum, observation) =>
      observation.max_ndvi === null
        ? maximum
        : maximum === null
          ? observation.max_ndvi
          : Math.max(maximum, observation.max_ndvi),
    null
  );

  return (
    <section
      className="tx-farm-page"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="tx-farm-container">
        <header className="tx-farm-hero">
          <div className="tx-farm-heading">
            <span className="tx-farm-eyebrow">
              <span className="tx-farm-eyebrow-dot" />
              {copy.eyebrow}
            </span>

            <h1>{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </div>

          <div className="tx-farm-header-actions">
            <button
              type="button"
              className="tx-farm-button tx-farm-button-secondary"
              onClick={onBack}
            >
              <span aria-hidden="true">←</span>
              {copy.back}
            </button>
          </div>
        </header>

        <section style={panelStyle}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <span className="tx-farm-card-symbol" aria-hidden="true">
              🛰️
            </span>

            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  margin: "0 0 5px",
                  color: "var(--farm-ink)",
                  fontSize: 18,
                }}
              >
                {copy.farm}
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "var(--farm-muted)",
                  fontSize: 12,
                  lineHeight: 1.8,
                }}
              >
                {copy.chooseFarm}
              </p>
            </div>
          </div>

          {mappedFarms.length === 0 ? (
            <div className="tx-farm-state">
              <span style={{ fontSize: 32 }} aria-hidden="true">
                📍
              </span>

              <h2>{copy.noMappedFarms}</h2>
              <p>{copy.noMappedFarmsHint}</p>
            </div>
          ) : (
            <>
              <label style={labelStyle}>
                {copy.farm}

                <select
                  value={selectedFarmId}
                  onChange={(event) => {
                    setSelectedFarmId(event.target.value);
                    setImageResult(null);
                    setStatisticsResult(null);
                    setComparisonResult(null);
                    setError("");
                  }}
                  style={inputStyle}
                >
                  {mappedFarms.map((farm) => (
                    <option key={farm.id} value={String(farm.id)}>
                      {farm.name} — {farm.location}
                    </option>
                  ))}
                </select>
              </label>

              {selectedFarm && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    marginTop: 14,
                    color: "var(--farm-muted)",
                    fontSize: 12,
                  }}
                >
                  <span>
                    📍 {copy.coordinates}:{" "}
                    {selectedFarm.latitude}, {selectedFarm.longitude}
                  </span>

                  <span>
                    🌱 {selectedFarm.current_crop || "—"}
                  </span>
                </div>
              )}
            </>
          )}
        </section>

        {error && (
          <div
            className="tx-farm-error"
            role="alert"
            style={{ marginBottom: 22 }}
          >
            <span aria-hidden="true">!</span>
            <p>{error}</p>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label={isArabic ? "إغلاق التنبيه" : "Dismiss alert"}
              style={{
                float: isArabic ? "left" : "right",
                border: 0,
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
                fontSize: 18,
              }}
            >
              ×
            </button>
          </div>
        )}

        <section style={panelStyle}>
          <div style={{ marginBottom: 20 }}>
            <span className="tx-farm-eyebrow">
              {isArabic ? "استكشاف بصري" : "VISUAL EXPLORATION"}
            </span>

            <h2
              style={{
                margin: "4px 0 7px",
                color: "var(--farm-ink)",
                fontSize: 22,
              }}
            >
              {copy.imageSection}
            </h2>

            <p
              style={{
                margin: 0,
                color: "var(--farm-muted)",
                fontSize: 12,
                lineHeight: 1.8,
              }}
            >
              {copy.imageHint}
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <label style={labelStyle}>
              {copy.startDate}

              <input
                type="date"
                value={startDate}
                max={endDate || getDateOffset(0)}
                onChange={(event) => setStartDate(event.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              {copy.endDate}

              <input
                type="date"
                value={endDate}
                min={startDate}
                max={getDateOffset(0)}
                onChange={(event) => setEndDate(event.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              {copy.imageType}

              <select
                value={imageType}
                onChange={(event) =>
                  setImageType(event.target.value as SatelliteImageType)
                }
                style={inputStyle}
              >
                <option value="ndvi">{copy.ndviImage}</option>
                <option value="true_color">{copy.trueColor}</option>
              </select>
            </label>

            <label style={labelStyle}>
              {copy.cloudCoverage}: {maxCloudCoverage}%

              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={maxCloudCoverage}
                onChange={(event) =>
                  setMaxCloudCoverage(Number(event.target.value))
                }
                style={{
                  width: "100%",
                  accentColor: "#65d894",
                  minHeight: 43,
                }}
              />
            </label>
          </div>

          <button
            type="button"
            className="tx-farm-button tx-farm-button-primary"
            onClick={() => void handleLoadImage()}
            disabled={!selectedFarm || loadingImage}
          >
            {loadingImage ? "◌ " : "🛰️ "}
            {loadingImage ? copy.loadingImage : copy.loadImage}
          </button>

          <div
            style={{
              marginTop: 22,
              padding: 14,
              border: "1px solid var(--farm-line)",
              borderRadius: 15,
              background: "var(--farm-bg)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: "var(--farm-ink)",
                  fontSize: 15,
                }}
              >
                {copy.imagePreview}
              </h3>

              {imageResult && (
                <span className="tx-farm-badge is-mapped">
                  {imageResult.is_real_satellite_data
                    ? `● ${copy.realData}`
                    : copy.notVerified}
                </span>
              )}
            </div>

            {imageResult ? (
              <>
                <img
                  src={imageResult.image_data_url}
                  alt={`${imageResult.image_type} satellite image for ${imageResult.farm_name}`}
                  style={{
                    display: "block",
                    width: "100%",
                    maxHeight: 580,
                    objectFit: "contain",
                    borderRadius: 12,
                    background: "#0b120e",
                  }}
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: 12,
                    marginTop: 14,
                    color: "var(--farm-muted)",
                    fontSize: 12,
                  }}
                >
                  <div>
                    <strong style={{ color: "var(--farm-ink)" }}>
                      {isArabic ? "المزرعة" : "Farm"}
                    </strong>
                    <p>{imageResult.farm_name}</p>
                  </div>

                  <div>
                    <strong style={{ color: "var(--farm-ink)" }}>
                      {copy.source}
                    </strong>
                    <p>{imageResult.source}</p>
                  </div>

                  <div>
                    <strong style={{ color: "var(--farm-ink)" }}>
                      {isArabic ? "الفترة" : "Period"}
                    </strong>
                    <p>
                      {imageResult.start_date} — {imageResult.end_date}
                    </p>
                  </div>

                  <div>
                    <strong style={{ color: "var(--farm-ink)" }}>
                      {isArabic ? "نطاق الإحداثيات" : "Image bounds"}
                    </strong>
                    <p style={{ overflowWrap: "anywhere" }}>
                      {imageResult.bbox.map((value) =>
                        formatNumber(value, 5, language)
                      ).join(", ")}
                    </p>
                  </div>
                </div>

                <p
                  style={{
                    color: "var(--farm-muted)",
                    fontSize: 12,
                    lineHeight: 1.8,
                  }}
                >
                  {imageResult.area_note}
                </p>
              </>
            ) : (
              <div className="tx-farm-state">
                {loadingImage ? (
                  <span className="tx-farm-spinner" />
                ) : (
                  <span style={{ fontSize: 32 }} aria-hidden="true">
                    🌍
                  </span>
                )}

                <h2>
                  {loadingImage ? copy.loadingImage : copy.noImage}
                </h2>

                <p>{copy.emptyHint}</p>
              </div>
            )}
          </div>
        </section>

        <section style={panelStyle}>
          <span className="tx-farm-eyebrow">
            {isArabic ? "مؤشرات الغطاء النباتي" : "VEGETATION INDICATORS"}
          </span>

          <h2
            style={{
              margin: "4px 0 7px",
              color: "var(--farm-ink)",
              fontSize: 22,
            }}
          >
            {copy.statistics}
          </h2>

          <p
            style={{
              margin: "0 0 18px",
              color: "var(--farm-muted)",
              fontSize: 12,
              lineHeight: 1.8,
            }}
          >
            {copy.statisticsHint}
          </p>

          <button
            type="button"
            className="tx-farm-button tx-farm-button-primary"
            onClick={() => void handleLoadStatistics()}
            disabled={!selectedFarm || loadingStatistics}
          >
            {loadingStatistics ? "◌ " : "▥ "}
            {loadingStatistics ? copy.loadingStatistics : copy.loadStatistics}
          </button>

          {statisticsResult ? (
            <>
              <div
                className="tx-farm-metrics"
                style={{ marginTop: 20, marginBottom: 20 }}
              >
                <article className="tx-farm-metric tx-farm-metric-green">
                  <span className="tx-farm-metric-icon" aria-hidden="true">
                    🌿
                  </span>

                  <div>
                    <p>{copy.mean}</p>

                    <strong>
                      {formatNumber(meanNdvi, 3, language)}
                    </strong>

                    <small>
                      {meanNdvi !== null
                        ? getNdviDescription(meanNdvi, isArabic)
                        : copy.noData}
                    </small>
                  </div>
                </article>

                <article className="tx-farm-metric tx-farm-metric-blue">
                  <span className="tx-farm-metric-icon" aria-hidden="true">
                    ↘
                  </span>

                  <div>
                    <p>{copy.minimum}</p>

                    <strong>
                      {formatNumber(minimumNdvi, 3, language)}
                    </strong>

                    <small>{copy.statistics}</small>
                  </div>
                </article>

                <article className="tx-farm-metric tx-farm-metric-amber">
                  <span className="tx-farm-metric-icon" aria-hidden="true">
                    ↗
                  </span>

                  <div>
                    <p>{copy.maximum}</p>

                    <strong>
                      {formatNumber(maximumNdvi, 3, language)}
                    </strong>

                    <small>
                      {statisticsResult.observation_count}{" "}
                      {copy.observations}
                    </small>
                  </div>
                </article>
              </div>

              <div
                style={{
                  border: "1px solid var(--farm-line)",
                  borderRadius: 14,
                  overflowX: "auto",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    padding: 16,
                    color: "var(--farm-ink)",
                    fontSize: 15,
                  }}
                >
                  {copy.observationHistory}
                </h3>

                {observations.length > 0 ? (
                  <table
                    style={{
                      width: "100%",
                      minWidth: 520,
                      borderCollapse: "collapse",
                      fontSize: 12,
                    }}
                  >
                    <thead>
                      <tr style={{ background: "var(--farm-bg)" }}>
                        {[copy.observationDate, copy.mean, copy.minimum, copy.maximum, copy.sampleCount].map(
                          (heading) => (
                            <th
                              key={heading}
                              style={{
                                padding: 12,
                                textAlign: isArabic ? "right" : "left",
                                color: "var(--farm-muted)",
                                borderBottom: "1px solid var(--farm-line)",
                              }}
                            >
                              {heading}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {observations.map((observation, index) => (
                        <tr key={`${observation.date ?? "unknown"}-${index}`}>
                          <td
                            style={{
                              padding: 12,
                              borderBottom: "1px solid var(--farm-line)",
                              color: "var(--farm-ink)",
                            }}
                          >
                            {observation.date ?? "—"}
                          </td>

                          {[observation.mean_ndvi, observation.min_ndvi, observation.max_ndvi].map(
                            (value, valueIndex) => (
                              <td
                                key={valueIndex}
                                style={{
                                  padding: 12,
                                  borderBottom: "1px solid var(--farm-line)",
                                  color: "var(--farm-ink)",
                                }}
                              >
                                {formatNumber(value, 3, language)}
                              </td>
                            )
                          )}

                          <td
                            style={{
                              padding: 12,
                              borderBottom: "1px solid var(--farm-line)",
                              color: "var(--farm-ink)",
                            }}
                          >
                            {formatNumber(observation.sample_count, 0, language)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p
                    style={{
                      padding: 16,
                      color: "var(--farm-muted)",
                      fontSize: 12,
                    }}
                  >
                    {copy.noObservations}
                  </p>
                )}
              </div>

              <p
                style={{
                  marginTop: 14,
                  color: "var(--farm-muted)",
                  fontSize: 12,
                  lineHeight: 1.8,
                }}
              >
                {copy.source}: {statisticsResult.source}
              </p>

              <p
                style={{
                  color: "var(--farm-muted)",
                  fontSize: 12,
                  lineHeight: 1.8,
                }}
              >
                {statisticsResult.area_note}
              </p>
            </>
          ) : (
            <div className="tx-farm-state" style={{ marginTop: 20 }}>
              {loadingStatistics && <span className="tx-farm-spinner" />}
              <h2>
                {loadingStatistics ? copy.loadingStatistics : copy.empty}
              </h2>
              <p>{copy.emptyHint}</p>
            </div>
          )}
        </section>

        <section style={panelStyle}>
          <span className="tx-farm-eyebrow">
            {isArabic ? "مقارنة التغيرات" : "CHANGE DETECTION"}
          </span>

          <h2
            style={{
              margin: "4px 0 7px",
              color: "var(--farm-ink)",
              fontSize: 22,
            }}
          >
            {copy.comparison}
          </h2>

          <p
            style={{
              margin: "0 0 18px",
              color: "var(--farm-muted)",
              fontSize: 12,
              lineHeight: 1.8,
            }}
          >
            {copy.comparisonHint}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: 16,
            }}
          >
            <div
              style={{
                padding: 16,
                border: "1px solid var(--farm-line)",
                borderRadius: 14,
                background: "var(--farm-bg)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 15px",
                  color: "var(--farm-ink)",
                  fontSize: 14,
                }}
              >
                {copy.firstPeriod}
              </h3>

              <div style={{ display: "grid", gap: 12 }}>
                <label style={labelStyle}>
                  {copy.startDate}

                  <input
                    type="date"
                    value={firstStartDate}
                    max={firstEndDate}
                    onChange={(event) =>
                      setFirstStartDate(event.target.value)
                    }
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  {copy.endDate}

                  <input
                    type="date"
                    value={firstEndDate}
                    min={firstStartDate}
                    max={getDateOffset(0)}
                    onChange={(event) =>
                      setFirstEndDate(event.target.value)
                    }
                    style={inputStyle}
                  />
                </label>
              </div>
            </div>

            <div
              style={{
                padding: 16,
                border: "1px solid var(--farm-line)",
                borderRadius: 14,
                background: "var(--farm-bg)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 15px",
                  color: "var(--farm-ink)",
                  fontSize: 14,
                }}
              >
                {copy.secondPeriod}
              </h3>

              <div style={{ display: "grid", gap: 12 }}>
                <label style={labelStyle}>
                  {copy.startDate}

                  <input
                    type="date"
                    value={secondStartDate}
                    max={secondEndDate}
                    onChange={(event) =>
                      setSecondStartDate(event.target.value)
                    }
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  {copy.endDate}

                  <input
                    type="date"
                    value={secondEndDate}
                    min={secondStartDate}
                    max={getDateOffset(0)}
                    onChange={(event) =>
                      setSecondEndDate(event.target.value)
                    }
                    style={inputStyle}
                  />
                </label>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="tx-farm-button tx-farm-button-primary"
            onClick={() => void handleCompare()}
            disabled={!selectedFarm || loadingComparison}
            style={{ marginTop: 18 }}
          >
            {loadingComparison ? "◌ " : "⇄ "}
            {loadingComparison ? copy.loadingComparison : copy.compare}
          </button>

          {comparisonResult ? (
            <div style={{ marginTop: 20 }}>
              <div
                className="tx-farm-metrics"
                style={{ marginBottom: 18 }}
              >
                <article className="tx-farm-metric tx-farm-metric-blue">
                  <span className="tx-farm-metric-icon" aria-hidden="true">
                    ◷
                  </span>

                  <div>
                    <p>{copy.firstPeriod}</p>

                    <strong>
                      {formatNumber(
                        comparisonResult.first_period.mean_ndvi,
                        3,
                        language
                      )}
                    </strong>

                    <small>
                      {comparisonResult.first_period.start_date} —{" "}
                      {comparisonResult.first_period.end_date}
                    </small>
                  </div>
                </article>

                <article className="tx-farm-metric tx-farm-metric-green">
                  <span className="tx-farm-metric-icon" aria-hidden="true">
                    ◷
                  </span>

                  <div>
                    <p>{copy.secondPeriod}</p>

                    <strong>
                      {formatNumber(
                        comparisonResult.second_period.mean_ndvi,
                        3,
                        language
                      )}
                    </strong>

                    <small>
                      {comparisonResult.second_period.start_date} —{" "}
                      {comparisonResult.second_period.end_date}
                    </small>
                  </div>
                </article>

                <article className="tx-farm-metric tx-farm-metric-amber">
                  <span className="tx-farm-metric-icon" aria-hidden="true">
                    {comparisonResult.ndvi_change >= 0 ? "↗" : "↘"}
                  </span>

                  <div>
                    <p>{copy.change}</p>

                    <strong>
                      {comparisonResult.ndvi_change > 0 ? "+" : ""}
                      {formatNumber(
                        comparisonResult.ndvi_change,
                        3,
                        language
                      )}
                    </strong>

                    <small>
                      {formatNumber(
                        comparisonResult.change_percentage_points,
                        2,
                        language
                      )}
                      {isArabic ? " نقطة مئوية" : " percentage points"}
                    </small>
                  </div>
                </article>
              </div>

              <div
                style={{
                  padding: 18,
                  border: "1px solid var(--farm-line)",
                  borderRadius: 14,
                  background: "var(--farm-bg)",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 10px",
                    color: "var(--farm-ink)",
                    fontSize: 15,
                  }}
                >
                  {copy.interpretation}
                </h3>

                <p
                  style={{
                    margin: 0,
                    color: "var(--farm-muted)",
                    fontSize: 13,
                    lineHeight: 1.9,
                  }}
                >
                  {comparisonResult.interpretation}
                </p>

                <p
                  style={{
                    margin: "12px 0 0",
                    color: "var(--farm-muted)",
                    fontSize: 12,
                  }}
                >
                  {copy.source}: {comparisonResult.source}
                </p>

                <p
                  style={{
                    margin: "10px 0 0",
                    color: "var(--farm-muted)",
                    fontSize: 12,
                    lineHeight: 1.8,
                  }}
                >
                  {comparisonResult.area_note}
                </p>
              </div>
            </div>
          ) : (
            <div className="tx-farm-state" style={{ marginTop: 20 }}>
              {loadingComparison && <span className="tx-farm-spinner" />}
              <h2>
                {loadingComparison ? copy.loadingComparison : copy.empty}
              </h2>
              <p>{copy.emptyHint}</p>
            </div>
          )}
        </section>

        <div
          style={{
            padding: 16,
            marginBottom: 22,
            border: "1px solid var(--farm-line)",
            borderRadius: 14,
            background: "var(--farm-bg)",
            color: "var(--farm-muted)",
            fontSize: 12,
            lineHeight: 1.9,
          }}
        >
          <span aria-hidden="true">ⓘ </span>
          {copy.disclaimer}
        </div>

        <footer className="tx-farm-page-footer">
          <span>
            <span className="tx-farm-footer-dot" />
            TerraShift AI
          </span>

          <span>{copy.footer}</span>
        </footer>
      </div>
    </section>
  );
}