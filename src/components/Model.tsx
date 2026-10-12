"use client";
import { useEffect, useRef, useState } from "react";

/** The internet model, the thing everything else hangs off. Call first; text is the launchpad to a phone conversation. */
const STEPS = ["Lead", "Call first", "Text", "Phone convo", "Appointment", "Visit", "Sale"];
export type ModelMark = { step: string; label: string; color: string };
/** Which step of the model an initiative is pushing on, from its name and area. */
export function stepFor(name: string, area?: string | null): string | null {
  const n = name.toLowerCase();
  if (/carwars/.test(n)) return null;
  if (/appointment/.test(n)) return "Appointment";
  if (/reasons to come in|come in|visit/.test(n)) return "Visit";
  if (/calls over|call first|phone conversation|voicemail/.test(n)) return "Phone convo";
  if (/text/.test(n)) return "Text";
  if (/bdc|first response|lead response|templates|lead handling|flexibility/.test(n)) return "Call first";
  if (area && /phone/i.test(area) && !/internet/i.test(area)) return "Phone convo";
  return null;
}
export function Model({ compact, marks = [] }: { compact?: boolean; marks?: ModelMark[] }) {
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
            <span className="model-word" data-step={s}>{s}
              {marks.some((m) => m.step === s) && (
                <span className="model-dots" aria-hidden="true">{marks.filter((m) => m.step === s).map((m, k) => <i key={k} style={{ background: m.color }} title={m.label} />)}</span>
              )}
            </span>
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
