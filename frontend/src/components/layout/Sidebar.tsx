
type SidebarProps = {
  language: "ar" | "en";
  activePage: string;
  onNavigate: (page: string) => void;
};

const menuItems = [
  { id: "dashboard", icon: "⌂", en: "Dashboard", ar: "لوحة التحكم" },
  { id: "farm", icon: "◉", en: "Farm Explorer", ar: "استكشاف المزرعة" },
  { id: "rotation", icon: "↻", en: "Crop Rotation", ar: "تدوير المحاصيل" },
  { id: "waterwise", icon: "♧", en: "WaterWise", ar: "إدارة المياه" },
  { id: "soilguardian", icon: "♨", en: "Soil Guardian", ar: "صحة التربة" },
  { id: "climate", icon: "☼", en: "Climate Intelligence", ar: "ذكاء المناخ" },
  {
    id: "satellite",
    icon: "🛰",
    en: "Satellite Intelligence",
    ar: "ذكاء الأقمار الصناعية",
  },
  {
    id: "crop-health",
    icon: "🌿",
    en: "Crop Health Alerts",
    ar: "تنبيهات صحة المحاصيل",
  },
  { id: "digital-twin", icon: "◎", en: "Digital Twin", ar: "التوأم الرقمي" },
  {
    id: "ai-advisor",
    icon: "✳",
    en: "AI Farm Advisor",
    ar: "المستشار الزراعي الذكي",
  },
];

export default function Sidebar({
  language,
  activePage,
  onNavigate,
}: SidebarProps) {
  const isArabic = language === "ar";

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">T</div>
        <div>
          <h2>TerraShift</h2>
          <span>AI AGRICULTURE</span>
        </div>
      </div>

      <div className="workspace-label">
        {isArabic ? "مساحة العمل" : "WORKSPACE"}
      </div>

      <nav
        className="navigation"
        aria-label={isArabic ? "القائمة الرئيسية" : "Main navigation"}
      >
        {menuItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item ${activePage === item.id ? "active" : ""}`}
            onClick={() => onNavigate(item.id)}
            aria-current={activePage === item.id ? "page" : undefined}
          >
            <span className="nav-icon" aria-hidden="true">
              {item.icon}
            </span>

            <span>{isArabic ? item.ar : item.en}</span>

            {activePage === item.id && (
              <span className="active-dot" aria-hidden="true" />
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="nasa-card">
          <span className="nasa-symbol">✦</span>

          <div>
            <strong>NASA Earth Data</strong>
            <p>
              {isArabic
                ? "بيانات الأرض لقرارات أذكى"
                : "Earth data for smarter decisions"}
            </p>
          </div>

          <span className="connection-dot" />
        </div>

        <div className="profile">
          <div className="avatar">TS</div>

          <div>
            <strong>
              {isArabic ? "مساحة تجريبية" : "Demo Workspace"}
            </strong>
            <span>{isArabic ? "مستخدم تجريبي" : "Demo User"}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
