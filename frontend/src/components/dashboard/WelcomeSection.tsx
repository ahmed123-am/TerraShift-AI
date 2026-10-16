type WelcomeSectionProps = {
  language: "ar" | "en";
  onAddFarm: () => void;
  onChooseLocation: () => void;
};

export default function WelcomeSection({
  language,
  onAddFarm,
  onChooseLocation,
}: WelcomeSectionProps) {
  const isArabic = language === "ar";

  return (
    <section className="welcome-section">
      <div>
        <div className="eyebrow">
          <span className="eyebrow-line" />

          {isArabic
            ? "الزراعة الذكية تبدأ من هنا"
            : "INTELLIGENCE FOR A GREENER PLANET"}
        </div>

        <h1>
          {isArabic ? (
            <>
              ازرع بذكاء،
              <br />
              <span>واصنع مستقبلًا أكثر استدامة.</span>
            </>
          ) : (
            <>
              Grow smarter.
              <br />
              <span>Build a resilient future.</span>
            </>
          )}
        </h1>

        <p className="welcome-description">
          {isArabic
            ? "حلل ظروف أرضك، وقارن خططك الزراعية، واتخذ قرارات مدعومة ببيانات الأرض والمناخ."
            : "Understand your land, compare crop rotation strategies, and make data-informed farming decisions."}
        </p>

        <div className="welcome-actions">
          <button
            className="primary-button"
            type="button"
            onClick={onAddFarm}
          >
            {isArabic ? "＋ إضافة مزرعة" : "＋ Add a farm"}
          </button>

          <button
            className="secondary-button"
            type="button"
            onClick={onChooseLocation}
          >
            {isArabic ? "اختيار الموقع ↗" : "Choose location ↗"}
          </button>
        </div>
      </div>

      <div className="hero-visual">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />

        <div className="earth-icon" aria-label="Planet Earth">
          🌎
        </div>

        <div className="floating-tag tag-top">
          <span>✦</span>
          NASA Earth Data
        </div>

        <div className="floating-tag tag-bottom">
          <span className="connection-dot" />

          {isArabic ? "تحليل بيئي ذكي" : "Earth intelligence"}
        </div>
      </div>
    </section>
  );
}