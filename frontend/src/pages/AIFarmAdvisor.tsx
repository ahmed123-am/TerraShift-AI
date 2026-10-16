
import { useState } from "react";
import type { FormEvent } from "react";
import "../styles/AIFarmAdvisor.css";

type Language = "ar" | "en";
type Farm = { id: number; name: string };
type Message = { role: "user" | "assistant"; content: string };

type Props = {
  language: Language;
  farms: Farm[];
  onBack: () => void;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export default function AIFarmAdvisor({
  language,
  farms,
  onBack,
}: Props) {
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isArabic = language === "ar";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || loading) return;

    const previousMessages = messages.slice(-10);
    const userMessage: Message = {
      role: "user",
      content: trimmedQuestion,
    };

    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/ai-farm-advisor/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: trimmedQuestion,
            farm_id: selectedFarmId
              ? Number(selectedFarmId)
              : null,
            language,
            history: previousMessages,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : isArabic
              ? "حصل خطأ أثناء الاتصال بالمستشار الذكي."
              : "Could not connect to the AI advisor."
        );
      }

      if (typeof data.answer !== "string" || !data.answer.trim()) {
        throw new Error(
          isArabic
            ? "وصل رد غير صالح من الخادم."
            : "The server returned an invalid response."
        );
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.answer },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isArabic
            ? "تعذر الاتصال بالخادم."
            : "Could not connect to the server."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ai-farm-advisor" dir={isArabic ? "rtl" : "ltr"}>
      <header className="ai-advisor-header">
        <button
          type="button"
          className="ai-advisor-back"
          onClick={onBack}
        >
          {isArabic ? "← العودة للرئيسية" : "← Back to dashboard"}
        </button>

        <span className="ai-advisor-eyebrow">TerraShift AI</span>

        <h1>
          {isArabic ? "المستشار الزراعي الذكي" : "AI Farm Advisor"}
        </h1>

        <p>
          {isArabic
            ? "مساعدك الذكي لفهم احتياجات مزرعتك واتخاذ قرارات زراعية أفضل."
            : "Your intelligent assistant for better agricultural decisions."}
        </p>
      </header>

      <section className="ai-advisor-card">
        <div className="ai-advisor-welcome">
          <div className="ai-advisor-icon" aria-hidden="true">
            ✳
          </div>

          <div>
            <h2>{isArabic ? "أهلاً بك!" : "Welcome!"}</h2>
            <p>
              {isArabic
                ? "اسأل عن المحاصيل أو التربة أو الري أو الظروف المناخية."
                : "Ask about crops, soil, irrigation, or climate conditions."}
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <section
            className="ai-advisor-messages"
            aria-label={isArabic ? "المحادثة" : "Conversation"}
            aria-live="polite"
          >
            {messages.map((message, index) => (
              <article
                key={`${index}-${message.role}`}
                className={`ai-advisor-message ai-advisor-message-${message.role}`}
              >
                <strong>
                  {message.role === "user"
                    ? isArabic
                      ? "أنت"
                      : "You"
                    : isArabic
                      ? "المستشار الذكي"
                      : "AI Advisor"}
                </strong>
                <p>{message.content}</p>
              </article>
            ))}

            {loading && (
              <p className="ai-advisor-note">
                {isArabic
                  ? "المستشار بيفكر في سؤالك..."
                  : "The advisor is thinking..."}
              </p>
            )}
          </section>
        )}

        {error && (
          <div className="ai-advisor-error" role="alert">
            {error}
          </div>
        )}

        <form className="ai-advisor-form" onSubmit={handleSubmit}>
          <label htmlFor="ai-advisor-farm">
            {isArabic ? "اختر المزرعة (اختياري)" : "Select a farm (optional)"}
          </label>

          <select
            id="ai-advisor-farm"
            value={selectedFarmId}
            onChange={(event) => setSelectedFarmId(event.target.value)}
            disabled={loading}
          >
            <option value="">
              {isArabic ? "بدون مزرعة محددة" : "No specific farm"}
            </option>

            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </select>

          <label htmlFor="ai-advisor-question">
            {isArabic ? "كيف يمكنني مساعدتك؟" : "How can I help you?"}
          </label>

          <textarea
            id="ai-advisor-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={
              isArabic
                ? "مثال: ما المحصول المناسب للتربة الموجودة في مزرعتي؟"
                : "Example: Which crop is suitable for my farm's soil?"
            }
            rows={5}
            maxLength={2000}
            required
            disabled={loading}
          />

          <div className="ai-advisor-form-footer">
            <span>{question.length}/2000</span>

            <button
              type="submit"
              disabled={!question.trim() || loading}
            >
              {loading
                ? isArabic
                  ? "جاري الإرسال..."
                  : "Sending..."
                : isArabic
                  ? "إرسال السؤال ↑"
                  : "Send question ↑"}
            </button>
          </div>
        </form>

        <p className="ai-advisor-note">
          {isArabic
            ? "قد تحتاج التوصيات الزراعية إلى التحقق من البيانات المحلية واستشارة مختص."
            : "Agricultural recommendations may require local data verification and expert advice."}
        </p>
      </section>
    </main>
  );
}
