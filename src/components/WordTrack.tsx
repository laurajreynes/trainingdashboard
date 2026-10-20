import type { ReactNode } from "react";

/**
 * Turns a plain word track into something you can read at a glance.
 *   ALL CAPS LINE            → section label
 *   - short bullet           → chip (long bullets stay a list)
 *   Label: "quoted line"     → numbered script step, the quote big
 *   WORD in caps mid-sentence → bold
 */
type Block =
  | { t: "h"; text: string }
  | { t: "chips"; items: string[] }
  | { t: "list"; items: string[] }
  | { t: "steps"; items: { label: string; quote: string }[] }
  | { t: "p"; text: string };

const isHeading = (l: string) => l.length > 3 && l === l.toUpperCase() && /[A-Z]/.test(l) && !/^- /.test(l);
const step = (l: string) => { const m = l.match(/^([A-Za-z][^:]{0,40}):\s*[“"](.+)[”"]\s*$/); return m ? { label: m[1].trim(), quote: m[2].trim() } : null; };

function parse(body: string): Block[] {
  const out: Block[] = [];
  const push = (b: Block) => out.push(b);
  let bullets: string[] = []; let steps: { label: string; quote: string }[] = [];
  const flush = () => {
    if (bullets.length) { push(bullets.every((b) => b.length <= 44) ? { t: "chips", items: bullets } : { t: "list", items: bullets }); bullets = []; }
    if (steps.length) { push({ t: "steps", items: steps }); steps = []; }
  };
  for (const raw of body.split(/\r?\n/)) {
    const l = raw.trim();
    if (!l) { flush(); continue; }
    if (/^[-•*]\s+/.test(l)) { if (steps.length) flush(); bullets.push(l.replace(/^[-•*]\s+/, "")); continue; }
    const s = step(l);
    if (s) { if (bullets.length) flush(); steps.push(s); continue; }
    flush();
    if (isHeading(l)) push({ t: "h", text: l }); else push({ t: "p", text: l });
  }
  flush();
  return out;
}

/** Bold a word or short phrase the author shouted (JUST, THEIR, A LOT), leave acronyms like BDC alone. */
function em(text: string): ReactNode {
  const parts = text.split(/(\b(?:[A-Z]{2,}(?:\s[A-Z]{2,})*)\b)/);
  return parts.map((p, i) => (i % 2 === 1 && !/^(BDC|CRM|GM|GSM|IT|PM|AM|CSI|OEM|VIN|MTD|PVR)$/.test(p) ? <strong key={i}>{p.charAt(0) + p.slice(1).toLowerCase()}</strong> : p));
}

export function WordTrack({ body }: { body: string }) {
  const blocks = parse(body);
  const structured = blocks.some((b) => b.t === "h" || b.t === "steps");
  if (!structured) return <div className="pre" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{body}</div>;
  let stepNo = 0;
  return (
    <div className="wt">
      {blocks.map((b, i) => {
        if (b.t === "h") return <div key={i} className="wt-h">{b.text.charAt(0) + b.text.slice(1).toLowerCase()}</div>;
        if (b.t === "chips") return <div key={i} className="wt-chips">{b.items.map((c, j) => <span key={j} className="wt-chip">{em(c)}</span>)}</div>;
        if (b.t === "list") return <ul key={i} className="wt-list">{b.items.map((c, j) => <li key={j}>{em(c)}</li>)}</ul>;
        if (b.t === "steps") return (
          <ol key={i} className="wt-steps">
            {b.items.map((s, j) => { stepNo += 1; return (
              <li key={j} className="wt-step"><span className="wt-n">{stepNo}</span><div><div className="wt-label">{s.label}</div><p className="wt-quote">“{em(s.quote)}”</p></div></li>
            ); })}
          </ol>
        );
        return <p key={i} className="wt-p">{em(b.text)}</p>;
      })}
    </div>
  );
}
