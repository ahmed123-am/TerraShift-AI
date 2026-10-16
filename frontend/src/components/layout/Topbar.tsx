type TopbarProps = {
  language: "ar" | "en";
  darkMode: boolean;
  onToggleLanguage: () => void;
  onToggleTheme: () => void;
};

export default function Topbar({
  language,
  darkMode,
  onToggleLanguage,
  onToggleTheme,
}: TopbarProps) {
  const isArabic = language === "ar";

  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>{isArabic ? "مساحة العمل" : "Workspace"}</span>
        <span>/</span>

        <strong>
          {isArabic ? "لوحة التحكم" : "Dashboard"}
        </strong>
      </div>

      <div className="topbar-actions">
        <div className="live-status">
          <span className="connection-dot" />

          {isArabic ? "النظام جاهز" : "System Ready"}
        </div>

        <button
          className="icon-button"
          type="button"
          onClick={onToggleLanguage}
          aria-label="Change language"
        >
          {isArabic ? "EN" : "ع"}
        </button>

        <button
          className="icon-button"
          type="button"
          onClick={onToggleTheme}
          aria-label="Change theme"
        >
          {darkMode ? "☀" : "☾"}
        </button>
      </div>
    </header>
  );
}