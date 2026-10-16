import { useState } from "react";
import WelcomeSection from "../components/dashboard/WelcomeSection";
import ClimateCard from "../components/dashboard/ClimateCard";
import RotationCard from "../components/dashboard/RotationCard";
import FarmMap from "../components/common/FarmMap";
import type { Farm } from "../services/farms";
import "../styles/Dashboard.css";

type DashboardProps = {
  language: "ar" | "en";
  farms: Farm[];
  loadingFarms: boolean;
  onAddFarm: () => void;
  onChooseLocation: () => void;
  onCreatePlan: () => void;
};

const workflows: {
  id: string;
  icon: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  detailEn: string;
  detailAr: string;
}[] = [
  {
    id: "waterwise",
    icon: "💧",
    titleEn: "WaterWise",
    titleAr: "تخطيط المياه",
    descriptionEn: "Review irrigation needs and water-use efficiency.",
    descriptionAr: "راجع احتياجات الري وكفاءة استخدام المياه.",
    detailEn: "Review irrigation needs and water-use efficiency for your farm. Use the available farm information to guide water planning.",
    detailAr: "راجع احتياجات الري وكفاءة استخدام المياه في مزرعتك، واستفد من بيانات المزرعة المتاحة لتوجيه تخطيط المياه.",
  },
  {
    id: "rotation",
    icon: "🌱",
    titleEn: "Crop Rotation",
    titleAr: "دورة المحاصيل",
    descriptionEn: "Plan crop sequences and support soil health.",
    descriptionAr: "راجع توصيات تدوير المحاصيل والخطط المحفوظة.",
    detailEn: "Explore crop-sequence planning and review saved rotation plans to support long-term soil health.",
    detailAr: "استعرض تخطيط تعاقب المحاصيل وراجع خطط التدوير المحفوظة لدعم صحة التربة على المدى الطويل.",
  },
  {
    id: "soilguardian",
    icon: "🪨",
    titleEn: "Soil Guardian",
    titleAr: "صحة التربة",
    descriptionEn: "Explore soil properties and condition indicators.",
    descriptionAr: "راجع التقييم الإرشادي بناءً على بيانات التربة.",
    detailEn: "Review soil properties and condition indicators. The guidance depends on the soil information available for your farm.",
    detailAr: "راجع خصائص التربة ومؤشرات حالتها. وتعتمد الإرشادات على بيانات التربة المتاحة لمزرعتك.",
  },
  {
    id: "climate",
    icon: "🌦️",
    titleEn: "Climate Intelligence",
    titleAr: "المناخ",
    descriptionEn: "Review weather conditions for your farm coordinates.",
    descriptionAr: "راجع الطقس المحلي عند توفر إحداثيات المزرعة.",
    detailEn: "Review local weather conditions when farm coordinates are available. Accurate location data helps make the information more relevant.",
    detailAr: "راجع حالة الطقس المحلية عند توفر إحداثيات المزرعة. تساعد بيانات الموقع الدقيقة في جعل المعلومات أكثر ارتباطًا بمزرعتك.",
  },
  {
    id: "digital-twin",
    icon: "◎",
    titleEn: "Digital Twin",
    titleAr: "التوأم الرقمي",
    descriptionEn: "Explore a digital overview of your saved farm data.",
    descriptionAr: "استعرض ملخصًا رقميًا لبيانات المزرعة المسجلة.",
    detailEn: "Explore a digital overview of saved farm information in one place. The overview reflects the data recorded in the system.",
    detailAr: "استعرض نظرة رقمية مجمعة على بيانات المزرعة المحفوظة في مكان واحد، وفقًا للمعلومات المسجلة في النظام.",
  },
];

export default function Dashboard({
  language,
  farms,
  loadingFarms,
  onAddFarm,
  onChooseLocation,
  onCreatePlan,
}: DashboardProps) {
  const isArabic = language === "ar";
  const [selectedWorkflow, setSelectedWorkflow] = useState<(typeof workflows)[number] | null>(null);

  const totalArea = farms.reduce(
    (total, farm) => total + (Number(farm.area_hectares) || 0),
    0
  );

  const crops = new Set(
    farms
      .map((farm) => farm.current_crop?.trim())
      .filter((crop): crop is string => Boolean(crop))
  );

  const soilTypes = new Set(
    farms.map((farm) => farm.soil_type).filter(Boolean)
  );

  const stats = [
    {
      id: "farms",
      icon: "⌖",
      label: isArabic ? "المزارع المسجلة" : "Registered Farms",
      value: loadingFarms ? "..." : String(farms.length),
      description: isArabic
        ? farms.length > 0
          ? "إجمالي المزارع في النظام"
          : "أضف أول مزرعة للبدء"
        : farms.length > 0
          ? "Total farms in the system"
          : "Add your first farm to get started",
      color: "green",
    },
    {
      id: "area",
      icon: "▦",
      label: isArabic ? "إجمالي المساحة" : "Total Farm Area",
      value: loadingFarms
        ? "..."
        : totalArea.toLocaleString(isArabic ? "ar-EG" : "en-US", {
            maximumFractionDigits: 2,
          }),
      description: isArabic ? "هكتار مسجل" : "Hectares registered",
      color: "blue",
    },
    {
      id: "crops",
      icon: "♧",
      label: isArabic ? "المحاصيل المختلفة" : "Different Crops",
      value: loadingFarms ? "..." : String(crops.size),
      description: isArabic
        ? "عدد أنواع المحاصيل المسجلة"
        : "Registered crop varieties",
      color: "orange",
    },
    {
      id: "soil",
      icon: "◈",
      label: isArabic ? "أنواع التربة" : "Soil Types",
      value: loadingFarms ? "..." : String(soilTypes.size),
      description: isArabic
        ? "أنواع التربة الموجودة في مزارعك"
        : "Soil types across your farms",
      color: "purple",
    },
  ];

  const soilLabels: Record<string, string> = {
    clay: isArabic ? "طينية" : "Clay",
    sandy: isArabic ? "رملية" : "Sandy",
    loamy: isArabic ? "طميية" : "Loamy",
    silty: isArabic ? "غرينية" : "Silty",
    other: isArabic ? "أخرى" : "Other",
  };

  return (
    <div className="dashboard-page" dir={isArabic ? "rtl" : "ltr"}>
      <WelcomeSection
        language={language}
        onAddFarm={onAddFarm}
        onChooseLocation={onChooseLocation}
      />

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <span className="dashboard-eyebrow">
              {isArabic ? "نظرة عامة" : "OVERVIEW"}
            </span>
            <h2>{isArabic ? "ملخص أداء مزارعك" : "Your Farm Overview"}</h2>
            <p>
              {isArabic
                ? "تابع المساحات والمحاصيل وأنواع التربة المسجلة في مكان واحد."
                : "Track your registered areas, crops, and soil types in one place."}
            </p>
          </div>
          <span className="period-label">
            <span className="connection-dot" />
            {isArabic ? "البيانات الحالية" : "CURRENT DATA"}
          </span>
        </div>

        <div className="stats-grid">
          {stats.map((stat) => {
            const progress =
              stat.id === "farms"
                ? farms.length > 0
                : stat.id === "area"
                  ? totalArea > 0
                  : stat.id === "crops"
                    ? crops.size > 0
                    : soilTypes.size > 0;

            return (
              <article
                className={`stat-card stat-${stat.color}`}
                key={stat.id}
              >
                <div className="stat-top">
                  <span className={`stat-icon ${stat.color}`}>{stat.icon}</span>
                  <span className="stat-label">{stat.label}</span>
                </div>
                <div className="stat-value">{stat.value}</div>
                <p className="stat-description">{stat.description}</p>
                <div className={`stat-progress ${stat.color}-progress`}>
                  <span style={{ width: progress ? "100%" : "0%" }} />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="dashboard-section farms-section">
        <div className="section-heading">
          <div>
            <span className="dashboard-eyebrow">
              {isArabic ? "إدارة المزارع" : "FARM MANAGEMENT"}
            </span>
            <h2>{isArabic ? "مزارعك المسجلة" : "Your Registered Farms"}</h2>
            <p>
              {isArabic
                ? "استعرض بيانات المزارع المحفوظة في النظام."
                : "Review the farm information saved in the system."}
            </p>
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={onAddFarm}
          >
            <span aria-hidden="true">＋</span>
            {isArabic ? "إضافة مزرعة" : "Add Farm"}
          </button>
        </div>

        {loadingFarms ? (
          <div className="dashboard-state" aria-live="polite">
            <span className="dashboard-loader" />
            <p>
              {isArabic
                ? "جاري تحميل بيانات المزارع..."
                : "Loading farm data..."}
            </p>
          </div>
        ) : farms.length > 0 ? (
          <div className="farm-dashboard-grid">
            {farms.map((farm) => (
              <article className="dashboard-farm-card" key={farm.id}>
                <div className="dashboard-farm-header">
                  <div className="dashboard-farm-icon">🌱</div>
                  <div className="dashboard-farm-title">
                    <span>
                      {isArabic ? "مزرعة مسجلة" : "REGISTERED FARM"}
                    </span>
                    <h3>{farm.name}</h3>
                  </div>
                  <span className="farm-status">
                    <span className="farm-status-dot" />
                    {isArabic ? "مسجلة" : "Registered"}
                  </span>
                </div>

                <div className="dashboard-farm-details">
                  <div className="dashboard-farm-detail">
                    <span>{isArabic ? "الموقع" : "Location"}</span>
                    <strong>
                      {farm.location ||
                        (isArabic ? "غير محدد" : "Not specified")}
                    </strong>
                  </div>
                  <div className="dashboard-farm-detail">
                    <span>{isArabic ? "المساحة" : "Area"}</span>
                    <strong>
                      {farm.area_hectares} {isArabic ? "هكتار" : "hectares"}
                    </strong>
                  </div>
                  <div className="dashboard-farm-detail">
                    <span>{isArabic ? "نوع التربة" : "Soil Type"}</span>
                    <strong>
                      {soilLabels[farm.soil_type] ?? farm.soil_type}
                    </strong>
                  </div>
                  <div className="dashboard-farm-detail">
                    <span>{isArabic ? "المحصول الحالي" : "Current Crop"}</span>
                    <strong>
                      {farm.current_crop ||
                        (isArabic ? "غير محدد" : "Not specified")}
                    </strong>
                  </div>
                </div>

                <div className="dashboard-farm-footer">
                  <span>{isArabic ? "رقم المزرعة" : "Farm ID"}</span>
                  <strong>#{farm.id}</strong>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="dashboard-empty-state">
            <div className="dashboard-empty-icon">🌾</div>
            <h3>
              {isArabic
                ? "ابدأ بإضافة مزرعتك الأولى"
                : "Start With Your First Farm"}
            </h3>
            <p>
              {isArabic
                ? "أضف بيانات مزرعتك لمتابعة المساحات والمحاصيل وتحليل بيانات الأرض."
                : "Add your farm to track areas, crops, and land data."}
            </p>
            <button
              className="primary-button"
              type="button"
              onClick={onAddFarm}
            >
              {isArabic ? "إضافة أول مزرعة" : "Add Your First Farm"}
            </button>
          </div>
        )}
      </section>

      <section className="dashboard-farm-map dashboard-section">
        <FarmMap farms={farms} language={language} height={420} />
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <span className="dashboard-eyebrow">
              {isArabic ? "الزراعة الذكية" : "SMART AGRICULTURE"}
            </span>
            <h2>{isArabic ? "أدوات التخطيط" : "Planning Tools"}</h2>
            <p>
              {isArabic
                ? "استعرض الأدوات المتاحة وتفاصيل كل أداة."
                : "Explore the available tools and their descriptions."}
            </p>
          </div>
        </div>

        <div className="workflow-grid">
          {workflows.map((workflow) => (
            <article className="workflow-card" key={workflow.id}>
              <div className="workflow-card-top">
                <span className="workflow-icon" aria-hidden="true">
                  {workflow.icon}
                </span>
                <span className="workflow-status">
                  {isArabic ? "أداة متاحة" : "Available tool"}
                </span>
              </div>

              <h3>{isArabic ? workflow.titleAr : workflow.titleEn}</h3>
              <p>
                {isArabic
                  ? workflow.descriptionAr
                  : workflow.descriptionEn}
              </p>

              <button
                type="button"
                className="primary-button workflow-open-button"
                onClick={() => setSelectedWorkflow(workflow)}
                aria-haspopup="dialog"
              >
                {isArabic ? "عرض التفاصيل" : "View details"}
                <span aria-hidden="true"> ↗</span>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <span className="dashboard-eyebrow">
              {isArabic ? "التخطيط" : "PLANNING"}
            </span>
            <h2>{isArabic ? "ملخص أدوات التخطيط" : "Planning Overview"}</h2>
            <p>
              {isArabic
                ? "استخدم أدوات التخطيط المتاحة لاتخاذ قرارات زراعية أفضل."
                : "Use the available planning tools to make better farming decisions."}
            </p>
          </div>
        </div>

        <div className="bottom-grid">
          <ClimateCard language={language} onCreatePlan={onCreatePlan} />
          <RotationCard language={language} onCreatePlan={onCreatePlan} />
        </div>
      </section>

      {selectedWorkflow && (
        <div
          className="workflow-details-backdrop"
          onClick={() => setSelectedWorkflow(null)}
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: "1rem",
            background: "rgba(15, 23, 18, 0.52)",
          }}
        >
          <section
            className="workflow-details-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workflow-details-title"
            dir={isArabic ? "rtl" : "ltr"}
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(100%, 520px)",
              padding: "1.5rem",
              borderRadius: "1rem",
              background: "var(--card-bg, #ffffff)",
              color: "var(--text-primary, #173b2c)",
              boxShadow: "0 24px 80px rgba(0, 0, 0, 0.24)",
              border: "1px solid var(--border-color, #dce8df)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <span className="workflow-icon" aria-hidden="true">{selectedWorkflow.icon}</span>
              <h2 id="workflow-details-title" style={{ margin: 0, flex: 1 }}>
                {isArabic ? selectedWorkflow.titleAr : selectedWorkflow.titleEn}
              </h2>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedWorkflow(null)}
                aria-label={isArabic ? "إغلاق التفاصيل" : "Close details"}
              >
                ✕
              </button>
            </div>
            <p style={{ lineHeight: 1.9, margin: "0 0 1.25rem" }}>
              {isArabic ? selectedWorkflow.detailAr : selectedWorkflow.detailEn}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <button
                type="button"
                className="primary-button"
                onClick={() => setSelectedWorkflow(null)}
              >
                {isArabic ? "إغلاق" : "Close"}
              </button>
            </div>
          </section>
        </div>
      )}

      <footer className="dashboard-footer">
        <span>TerraShift AI © 2026</span>
        <span>
          {isArabic
            ? "بيانات أفضل. قرارات أذكى. أرض أكثر استدامة."
            : "Better data. Smarter decisions. A more resilient Earth."}
        </span>
      </footer>
    </div>
  );
}
