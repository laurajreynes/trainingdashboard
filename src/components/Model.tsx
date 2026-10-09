/** The internet model, the thing everything else hangs off. Call first; text is the launchpad to a phone conversation. */
const STEPS = ["Lead", "Call first", "Text", "Phone convo", "Appointment", "Visit", "Sale"];
export function Model({ compact }: { compact?: boolean }) {
  return (
    <div className={`model${compact ? " compact" : ""}`} aria-label="Internet model">
      <div className="model-row">
        {STEPS.map((s, i) => (
          <span key={s} className={`model-step${s === "Text" ? " launch-from" : s === "Phone convo" ? " launch-to" : ""}`}>
            <span className="model-word">{s}</span>
            {i < STEPS.length - 1 && <span className="model-arrow" aria-hidden="true">→</span>}
          </span>
        ))}
      </div>
      {!compact && (
        <div className="model-note" aria-hidden="true">
          <span className="model-bracket" />
          <span className="model-caption">Text is the launchpad to a phone conversation</span>
        </div>
      )}
    </div>
  );
}
