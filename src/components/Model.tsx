/** The internet model, the thing everything else hangs off: Lead → Text → Phone convo → Appointment → Visit → Sale. */
const STEPS = ["Lead", "Text", "Phone convo", "Appointment", "Visit", "Sale"];
export function Model({ compact }: { compact?: boolean }) {
  return (
    <div className={`model${compact ? " compact" : ""}`} aria-label="Internet model">
      {STEPS.map((s, i) => (
        <span key={s} className="model-step">
          <span className="model-word">{s}</span>
          {i < STEPS.length - 1 && <span className="model-arrow" aria-hidden="true">→</span>}
        </span>
      ))}
    </div>
  );
}
