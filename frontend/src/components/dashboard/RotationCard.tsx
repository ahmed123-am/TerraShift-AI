type RotationCardProps = {
  language: "ar" | "en";
  onCreatePlan: () => void;
};

export default function RotationCard({
  language,
  onCreatePlan,
}: RotationCardProps) {
  const isArabic = language === "ar";

  return (
    <article className="panel rotation-panel">
      <div className="panel-heading">
        <div>
          <span className="panel-kicker">
            {isArabic ? "التخطيط الذكي" : "SMART PLANNING"}
          </span>

          <h2>
            {isArabic ? "خطط تدوير المحاصيل" : "Crop Rotation Plans"}
          </h2>
        </div>

        <span className="panel-icon">↻</span>
      </div>

      <div className="empty-state">
        <div className="empty-icon">🌱</div>

        <h3>
          {isArabic
            ? "ابدأ خطتك الزراعية الأولى"
            : "Start your first farm plan"}
        </h3>

        <p>
          {isArabic
            ? "أنشئ خطة لتدوير المحاصيل تساعدك على تحسين صحة التربة وترشيد استهلاك المياه والتكيف مع تغيرات المناخ."
            : "Create a crop rotation plan to improve soil health, conserve water, and adapt to changing climate conditions."}
        </p>

        <button
          type="button"
          className="primary-button"
          onClick={onCreatePlan}
        >
          {isArabic ? "إنشاء خطة جديدة +" : "Create New Plan +"}
        </button>
      </div>

      <div className="rotation-benefits">
        <div>
          <span>✓</span>
          {isArabic ? "تحسين صحة التربة" : "Improve soil health"}
        </div>

        <div>
          <span>✓</span>
          {isArabic ? "ترشيد استهلاك المياه" : "Conserve water"}
        </div>

        <div>
          <span>✓</span>
          {isArabic ? "التكيف مع المناخ" : "Adapt to climate"}
        </div>
      </div>
    </article>
  );
}