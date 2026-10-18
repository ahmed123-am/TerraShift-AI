
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import NdviTrendChart from "../components/common/NdviTrendChart";
import {
  getCropHealthAlerts,
  scanCropHealth,
  updateCropHealthAlertStatus,
  type AlertSeverity,
  type AlertStatus,
  type CropHealthAlert,
} from "../services/cropHealthAlerts";

type Language = "ar" | "en";

interface CropHealthAlertsProps {
  language: Language;
}

interface FarmOption {
  id: number;
  name: string;
}

interface ScanResult {
  created_count: number;
  ignored_observation_count: number;
  baseline: { mean_ndvi: number };
}

const API_BASE_URL = "https://terra-shift-ai.vercel.app";

const translations = {
  en: {
    title: "Crop Health Alerts",
    subtitle: "Monitor vegetation health using Sentinel-2 NDVI observations.",
    scan: "Run satellite scan",
    scanning: "Scanning satellite data...",
    refresh: "Refresh alerts",
    loading: "Loading alerts...",
    farm: "Farm",
    allFarms: "All farms",
    status: "Status",
    severity: "Severity",
    allStatuses: "All statuses",
    allSeverities: "All severities",
    open: "Open",
    reviewed: "Reviewed",
    resolved: "Resolved",
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
    observationDate: "Observation date",
    baseline: "Baseline NDVI",
    observed: "Observed NDVI",
    decline: "NDVI decline",
    source: "Source",
    markReviewed: "Mark reviewed",
    markResolved: "Resolve",
    reopen: "Reopen",
    noAlerts: "No alerts found.",
    loadError: "Could not load alerts.",
    scanSuccess: "Scan completed.",
    scanError: "Satellite scan failed.",
    updateError: "Could not update alert status.",
    scanFarm: "Select a farm to scan",
    startDate: "Start date",
    endDate: "End date",
    cloudCoverage: "Maximum cloud coverage (%)",
    baselineDays: "Baseline days",
    disclaimer:
      "An NDVI decline is a screening indicator, not a confirmed diagnosis of crop disease or its cause.",
    created: "New alerts",
    ignored: "Observations without alerts",
    baselineMean: "Baseline mean NDVI",
    retry: "Retry",
    actions: "Actions",
    invalidDates: "Start date must be before or equal to end date.",
    futureDate: "End date cannot be in the future.",
    loadFarmsError: "Could not load farms.",
    alertUpdated: "Alert status updated.",
    important: "Important: ",
  },
  ar: {
    title: "تنبيهات صحة المحاصيل",
    subtitle: "راقب صحة الغطاء النباتي باستخدام قراءات NDVI من Sentinel-2.",
    scan: "بدء فحص الأقمار الصناعية",
    scanning: "جارٍ فحص بيانات الأقمار الصناعية...",
    refresh: "تحديث التنبيهات",
    loading: "جارٍ تحميل التنبيهات...",
    farm: "المزرعة",
    allFarms: "كل المزارع",
    status: "الحالة",
    severity: "درجة الخطورة",
    allStatuses: "كل الحالات",
    allSeverities: "كل درجات الخطورة",
    open: "مفتوح",
    reviewed: "تمت المراجعة",
    resolved: "تم الحل",
    low: "منخفض",
    medium: "متوسط",
    high: "مرتفع",
    critical: "حرج",
    observationDate: "تاريخ الرصد",
    baseline: "NDVI الأساسي",
    observed: "NDVI المرصود",
    decline: "مقدار الانخفاض",
    source: "المصدر",
    markReviewed: "تحديد كمُراجع",
    markResolved: "تحديد كمحلول",
    reopen: "إعادة الفتح",
    noAlerts: "لا توجد تنبيهات.",
    loadError: "تعذر تحميل التنبيهات.",
    scanSuccess: "اكتمل الفحص.",
    scanError: "فشل فحص الأقمار الصناعية.",
    updateError: "تعذر تحديث حالة التنبيه.",
    scanFarm: "اختر مزرعة للفحص",
    startDate: "تاريخ البداية",
    endDate: "تاريخ النهاية",
    cloudCoverage: "أقصى تغطية سحابية (%)",
    baselineDays: "أيام الفترة الأساسية",
    disclaimer:
      "انخفاض NDVI مؤشر يستدعي الفحص، وليس تشخيصًا مؤكدًا لمرض المحصول أو لسبب الانخفاض.",
    created: "التنبيهات الجديدة",
    ignored: "قراءات بلا تنبيهات",
    baselineMean: "متوسط NDVI الأساسي",
    retry: "إعادة المحاولة",
    actions: "الإجراءات",
    invalidDates: "تاريخ البداية يجب أن يسبق تاريخ النهاية أو يساويه.",
    futureDate: "لا يمكن اختيار تاريخ نهاية في المستقبل.",
    loadFarmsError: "تعذر تحميل المزارع.",
    alertUpdated: "تم تحديث حالة التنبيه.",
    important: "تنبيه مهم: ",
  },
} as const;

const severityColors: Record<AlertSeverity, string> = {
  low: "#16a34a",
  medium: "#ca8a04",
  high: "#ea580c",
  critical: "#dc2626",
};

function formatNdvi(value: number): string {
  return Number(value).toFixed(3);
}

function getLocalDate(daysAgo = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function CropHealthAlerts({
  language,
}: CropHealthAlertsProps) {
  const t = translations[language];
  const isArabic = language === "ar";

  const [alerts, setAlerts] = useState<CropHealthAlert[]>([]);
  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [selectedFarm, setSelectedFarm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const [startDate, setStartDate] = useState(getLocalDate(30));
  const [endDate, setEndDate] = useState(getLocalDate(1));
  const [cloudCoverage, setCloudCoverage] = useState(30);
  const [baselineDays, setBaselineDays] = useState(30);

  const styles = {
    page: {
      padding: "24px",
      color: "var(--text-primary, #172033)",
      direction: isArabic ? ("rtl" as const) : ("ltr" as const),
      maxWidth: "1500px",
      margin: "0 auto",
    },
    panel: {
      background: "var(--card-bg, #ffffff)",
      border: "1px solid var(--border-color, #e5e7eb)",
      borderRadius: "16px",
      padding: "20px",
      marginBottom: "20px",
    },
    input: {
      width: "100%",
      boxSizing: "border-box" as const,
      padding: "10px 12px",
      borderRadius: "9px",
      border: "1px solid var(--border-color, #d1d5db)",
      background: "var(--input-bg, #ffffff)",
      color: "inherit",
      fontSize: "14px",
    },
    button: {
      padding: "10px 14px",
      borderRadius: "9px",
      border: "none",
      cursor: "pointer",
      fontWeight: 600,
      fontSize: "14px",
    },
    muted: {
      color: "var(--text-secondary, #64748b)",
      fontSize: "13px",
    },
  };

  const loadFarms = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/farms`);

      if (!response.ok) {
        throw new Error(t.loadFarmsError);
      }

      const data = (await response.json()) as FarmOption[];
      setFarms(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadFarmsError);
    }
  }, [t.loadFarmsError]);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getCropHealthAlerts({
        farm_id: selectedFarm ? Number(selectedFarm) : undefined,
        status: statusFilter
          ? (statusFilter as AlertStatus)
          : undefined,
        severity: severityFilter
          ? (severityFilter as AlertSeverity)
          : undefined,
        limit: 200,
      });

      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError);
    } finally {
      setLoading(false);
    }
  }, [selectedFarm, statusFilter, severityFilter, t.loadError]);

  useEffect(() => {
    void loadFarms();
  }, [loadFarms]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  async function handleScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setScanResult(null);

    if (!selectedFarm) {
      setError(t.scanFarm);
      return;
    }

    if (startDate > endDate) {
      setError(t.invalidDates);
      return;
    }

    if (endDate > getLocalDate()) {
      setError(t.futureDate);
      return;
    }

    setScanning(true);

    try {
      const result = await scanCropHealth({
        farm_id: Number(selectedFarm),
        start_date: startDate,
        end_date: endDate,
        max_cloud_coverage: cloudCoverage,
        baseline_days: baselineDays,
      });

      setScanResult(result);
      setNotice(`${t.scanSuccess} ${t.created}: ${result.created_count}`);

      await loadAlerts();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.scanError);
    } finally {
      setScanning(false);
    }
  }

  async function handleStatusChange(
    alertId: number,
    status: AlertStatus,
  ) {
    setUpdatingId(alertId);
    setError("");
    setNotice("");

    try {
      await updateCropHealthAlertStatus(alertId, status);
      setNotice(t.alertUpdated);
      await loadAlerts();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.updateError);
    } finally {
      setUpdatingId(null);
    }
  }

  const openCount = alerts.filter(
    (alert) => alert.status === "open",
  ).length;

  const highPriorityCount = alerts.filter(
    (alert) =>
      alert.severity === "high" || alert.severity === "critical",
  ).length;

  const stats = [
    {
      label: t.title,
      value: alerts.length,
      color: "#2563eb",
    },
    {
      label: t.open,
      value: openCount,
      color: "#ca8a04",
    },
    {
      label: `${t.high} / ${t.critical}`,
      value: highPriorityCount,
      color: "#dc2626",
    },
  ];

  return (
    <main style={styles.page}>
      <NdviTrendChart
        farmId={selectedFarm ? Number(selectedFarm) : null}
        language={language}
      />

      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: "28px" }}>
            {t.title}
          </h1>
          <p style={{ margin: 0, ...styles.muted }}>{t.subtitle}</p>
        </div>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              ...styles.panel,
              margin: 0,
              borderTop: `4px solid ${stat.color}`,
            }}
          >
            <p style={{ margin: "0 0 8px", ...styles.muted }}>
              {stat.label}
            </p>
            <strong style={{ fontSize: "30px" }}>{stat.value}</strong>
          </div>
        ))}
      </section>

      <section style={styles.panel}>
        <h2 style={{ marginTop: 0, fontSize: "19px" }}>{t.scan}</h2>

        <form onSubmit={handleScan}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "14px",
            }}
          >
            <label>
              <span style={{ display: "block", marginBottom: "7px" }}>
                {t.farm}
              </span>
              <select
                value={selectedFarm}
                onChange={(event) => setSelectedFarm(event.target.value)}
                required
                style={styles.input}
              >
                <option value="">{t.scanFarm}</option>
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name} (#{farm.id})
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span style={{ display: "block", marginBottom: "7px" }}>
                {t.startDate}
              </span>
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
                style={styles.input}
              />
            </label>

            <label>
              <span style={{ display: "block", marginBottom: "7px" }}>
                {t.endDate}
              </span>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={getLocalDate()}
                onChange={(event) => setEndDate(event.target.value)}
                required
                style={styles.input}
              />
            </label>

            <label>
              <span style={{ display: "block", marginBottom: "7px" }}>
                {t.cloudCoverage}
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={cloudCoverage}
                onChange={(event) =>
                  setCloudCoverage(Number(event.target.value))
                }
                style={styles.input}
              />
            </label>

            <label>
              <span style={{ display: "block", marginBottom: "7px" }}>
                {t.baselineDays}
              </span>
              <input
                type="number"
                min={7}
                max={180}
                value={baselineDays}
                onChange={(event) =>
                  setBaselineDays(Number(event.target.value))
                }
                style={styles.input}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={scanning || !selectedFarm}
            style={{
              ...styles.button,
              marginTop: "16px",
              background: scanning ? "#94a3b8" : "#2563eb",
              color: "#ffffff",
              opacity: scanning || !selectedFarm ? 0.7 : 1,
            }}
          >
            {scanning ? t.scanning : t.scan}
          </button>
        </form>

        {scanResult && (
          <div
            style={{
              marginTop: "16px",
              padding: "14px",
              borderRadius: "10px",
              background: "var(--success-bg, #f0fdf4)",
              border: "1px solid var(--success-border, #bbf7d0)",
              color: "var(--text-primary, #166534)",
            }}
          >
            <strong>{notice}</strong>
            <p>
              {t.baselineMean}:{" "}
              {formatNdvi(scanResult.baseline.mean_ndvi)}
            </p>
            <p>
              {t.ignored}: {scanResult.ignored_observation_count}
            </p>
          </div>
        )}
      </section>

      <section style={styles.panel}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            marginBottom: "18px",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "19px" }}>{t.title}</h2>
          <button
            type="button"
            onClick={() => void loadAlerts()}
            disabled={loading}
            style={{
              ...styles.button,
              background: "var(--button-secondary-bg, #e2e8f0)",
              color: "inherit",
            }}
          >
            {t.refresh}
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            marginBottom: "18px",
          }}
        >
          <label>
            <span style={{ display: "block", marginBottom: "7px" }}>
              {t.farm}
            </span>
            <select
              value={selectedFarm}
              onChange={(event) => setSelectedFarm(event.target.value)}
              style={styles.input}
            >
              <option value="">{t.allFarms}</option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span style={{ display: "block", marginBottom: "7px" }}>
              {t.status}
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={styles.input}
            >
              <option value="">{t.allStatuses}</option>
              <option value="open">{t.open}</option>
              <option value="reviewed">{t.reviewed}</option>
              <option value="resolved">{t.resolved}</option>
            </select>
          </label>

          <label>
            <span style={{ display: "block", marginBottom: "7px" }}>
              {t.severity}
            </span>
            <select
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value)}
              style={styles.input}
            >
              <option value="">{t.allSeverities}</option>
              <option value="low">{t.low}</option>
              <option value="medium">{t.medium}</option>
              <option value="high">{t.high}</option>
              <option value="critical">{t.critical}</option>
            </select>
          </label>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: "12px",
              marginBottom: "14px",
              borderRadius: "9px",
              background: "var(--error-bg, #fef2f2)",
              color: "var(--error-text, #b91c1c)",
            }}
          >
            {error}
            <button
              type="button"
              onClick={() => void loadAlerts()}
              style={{
                ...styles.button,
                marginInlineStart: "10px",
                background: "transparent",
                color: "inherit",
                textDecoration: "underline",
              }}
            >
              {t.retry}
            </button>
          </div>
        )}

        {notice && !scanResult && (
          <p role="status" style={{ color: "#16a34a" }}>
            {notice}
          </p>
        )}

        {loading ? (
          <p>{t.loading}</p>
        ) : alerts.length === 0 ? (
          <p style={styles.muted}>{t.noAlerts}</p>
        ) : (
          <div style={{ display: "grid", gap: "14px" }}>
            {alerts.map((alert: CropHealthAlert) => (
              <article
                key={alert.id}
                style={{
                  padding: "16px",
                  border: "1px solid var(--border-color, #e5e7eb)",
                  borderInlineStart: `5px solid ${severityColors[alert.severity]}`,
                  borderRadius: "12px",
                  background: "var(--card-bg, #ffffff)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <div>
                    <h3 style={{ margin: "0 0 5px", fontSize: "17px" }}>
                      {alert.farm_name}
                    </h3>
                    <p style={{ margin: 0, ...styles.muted }}>
                      {t.observationDate}: {alert.observation_date}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        padding: "5px 10px",
                        borderRadius: "20px",
                        background: `${severityColors[alert.severity]}18`,
                        color: severityColors[alert.severity],
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      {t[alert.severity]}
                    </span>

                    <span
                      style={{
                        padding: "5px 10px",
                        borderRadius: "20px",
                        background: "var(--badge-bg, #f1f5f9)",
                        fontSize: "12px",
                      }}
                    >
                      {t[alert.status]}
                    </span>
                  </div>
                </div>

                <p style={{ lineHeight: 1.7 }}>{alert.message}</p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: "12px",
                    marginBottom: "14px",
                  }}
                >
                  <div>
                    <p style={{ margin: "0 0 4px", ...styles.muted }}>
                      {t.baseline}
                    </p>
                    <strong>{formatNdvi(alert.baseline_ndvi)}</strong>
                  </div>

                  <div>
                    <p style={{ margin: "0 0 4px", ...styles.muted }}>
                      {t.observed}
                    </p>
                    <strong>{formatNdvi(alert.observed_ndvi)}</strong>
                  </div>

                  <div>
                    <p style={{ margin: "0 0 4px", ...styles.muted }}>
                      {t.decline}
                    </p>
                    <strong style={{ color: severityColors[alert.severity] }}>
                      {formatNdvi(alert.ndvi_drop)}
                    </strong>
                  </div>

                  <div>
                    <p style={{ margin: "0 0 4px", ...styles.muted }}>
                      {t.source}
                    </p>
                    <strong style={{ fontSize: "12px" }}>
                      {alert.source}
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  {alert.status === "open" && (
                    <button
                      type="button"
                      disabled={updatingId === alert.id}
                      onClick={() =>
                        void handleStatusChange(alert.id, "reviewed")
                      }
                      style={{
                        ...styles.button,
                        background: "#e0f2fe",
                        color: "#075985",
                      }}
                    >
                      {t.markReviewed}
                    </button>
                  )}

                  {alert.status !== "resolved" && (
                    <button
                      type="button"
                      disabled={updatingId === alert.id}
                      onClick={() =>
                        void handleStatusChange(alert.id, "resolved")
                      }
                      style={{
                        ...styles.button,
                        background: "#dcfce7",
                        color: "#166534",
                      }}
                    >
                      {t.markResolved}
                    </button>
                  )}

                  {alert.status !== "open" && (
                    <button
                      type="button"
                      disabled={updatingId === alert.id}
                      onClick={() =>
                        void handleStatusChange(alert.id, "open")
                      }
                      style={{
                        ...styles.button,
                        background: "#fef3c7",
                        color: "#92400e",
                      }}
                    >
                      {t.reopen}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer
        style={{
          padding: "16px",
          borderRadius: "10px",
          background: "var(--notice-bg, #eff6ff)",
          color: "var(--notice-text, #1e40af)",
          fontSize: "13px",
          lineHeight: 1.7,
        }}
      >
        <strong>{t.important}</strong>
        {t.disclaimer}
      </footer>
    </main>
  );
}
