"use client";
import { useEffect, useRef, useState } from "react";

/** The internet model, the thing everything else hangs off. Call first; text is the launchpad to a phone conversation. */
const STEPS = ["Lead", "Call first", "Text", "Phone convo", "Appointment", "Visit", "Sale"];
export function Model({ compact }: { compact?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [span, setSpan] = useState<{ left: number; width: number } | null>(null);
  useEffect(() => {
    const measure = () => {
      const b = box.current; if (!b) return;
      const text = b.querySelector<HTMLElement>('[data-step="Text"]'), phone = b.querySelector<HTMLElement>('[data-step="Phone convo"]');
      if (!text || !phone) return;
      const r0 = b.getBoundingClientRect(), t = text.getBoundingClientRect(), p = phone.getBoundingClientRect();
      if (Math.abs(t.top - p.top) > 4) { setSpan(null); return; }   // wrapped onto two lines: skip the bracket
      setSpan({ left: t.left - r0.left, width: p.left + p.width / 2 - t.left });
    };
    measure(); window.addEventListener("resize", measure); document.fonts?.ready.then(measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  return (
    <div className={`model${compact ? " compact" : ""}`} aria-label="Internet model" ref={box}>
      <div className="model-row">
        {STEPS.map((s, i) => (
          <span key={s} className="model-step">
            <span className="model-word" data-step={s}>{s}</span>
            {i < STEPS.length - 1 && <span className="model-arrow" aria-hidden="true">→</span>}
          </span>
        ))}
      </div>
      {!compact && span && (
        <div className="model-note" aria-hidden="true" style={{ paddingLeft: span.left }}>
          <span className="model-bracket" style={{ width: span.width }} />
          <span className="model-capwrap" style={{ width: span.width }}><span className="model-caption">Text is the launchpad to a phone conversation</span></span>
        </div>
      )}
    </div>
  );
}
