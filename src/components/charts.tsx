/**
 * Small server-rendered charts. Plain SVG, no client JS.
 * Marks: bars <= 24px, 4px rounded data-end, labels at the tip, recessive axes.
 */

export type BarRow = { label: string; value: number; color?: string; sub?: string; href?: string; max?: number };

/** Horizontal bars. One row per entity, value labeled at the tip. */
export function HBars({ rows, unit = "", max, showTrack = true }: { rows: BarRow[]; unit?: string; max?: number; showTrack?: boolean }) {
  if (!rows.length) return <p className="empty">Nothing to chart yet</p>;
  const top = max ?? Math.max(1, ...rows.map((r) => r.max ?? r.value));
  return (
    <div className="hbars" role="img" aria-label="Bar chart">
      {rows.map((r) => {
        const w = Math.max(0, Math.min(100, (r.value / top) * 100));
        const fill = r.color || "var(--brand)";
        return (
          <div className="hbar" key={r.label} title={`${r.label}: ${r.value}${unit}${r.sub ? ` (${r.sub})` : ""}`}>
            <div className="hbar-label">{r.href ? <a href={r.href}>{r.label}</a> : r.label}</div>
            <div className="hbar-track" style={showTrack ? undefined : { background: "transparent" }}>
              <div className="hbar-fill" style={{ width: `${w}%`, background: fill }} />
            </div>
            <div className="hbar-val">{r.value}{unit}{r.sub && <span className="faint"> {r.sub}</span>}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Small vertical columns over time (months or weeks). */
export function Columns({ points, color = "var(--brand)", height = 72, unit = "" }: { points: { label: string; value: number; hint?: string }[]; color?: string; height?: number; unit?: string }) {
  if (!points.length) return <p className="empty">No data yet</p>;
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <div className="cols" style={{ height }} role="img" aria-label="Column chart">
      {points.map((p, i) => {
        const h = (p.value / max) * 100;
        const last = i === points.length - 1;
        return (
          <div className="col" key={p.label} title={`${p.hint || p.label}: ${p.value}${unit}`}>
            <div className="col-val">{p.value > 0 ? `${p.value}${unit}` : ""}</div>
            <div className="col-track">
              <div className="col-fill" style={{ height: `${h}%`, background: color, opacity: last ? 1 : 0.55 }} />
            </div>
            <div className="col-label">{p.label}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Meter for one ratio against a target. Track is a lighter step of the same hue. */
export function Meter({ value, target, unit = "", label, color = "var(--brand)" }: { value: number; target?: number | null; unit?: string; label?: string; color?: string }) {
  const top = Math.max(target ?? 0, value, 1);
  const w = Math.min(100, (value / top) * 100);
  const t = target != null ? Math.min(100, (target / top) * 100) : null;
  return (
    <div className="meter" title={`${label ? label + ": " : ""}${value}${unit}${target != null ? ` of ${target}${unit}` : ""}`}>
      {label && <div className="meter-label"><span>{label}</span><strong>{value}{unit}{target != null && <span className="faint"> / {target}{unit}</span>}</strong></div>}
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${w}%`, background: color }} />
        {t !== null && <div className="meter-target" style={{ left: `${t}%` }} />}
      </div>
    </div>
  );
}

/** Stacked bar for part-to-whole, with a 2px surface gap between segments. */
export function Stacked({ parts, total }: { parts: { label: string; value: number; color: string }[]; total?: number }) {
  const sum = total ?? parts.reduce((a, p) => a + p.value, 0);
  if (!sum) return <p className="empty">Nothing yet</p>;
  return (
    <div>
      <div className="stacked" role="img" aria-label="Stacked bar">
        {parts.filter((p) => p.value > 0).map((p) => (
          <div key={p.label} className="stacked-seg" style={{ width: `${(p.value / sum) * 100}%`, background: p.color }} title={`${p.label}: ${p.value}`} />
        ))}
      </div>
      <div className="legend">
        {parts.map((p) => <span key={p.label}><i style={{ background: p.color }} />{p.label} {p.value}</span>)}
      </div>
    </div>
  );
}

/** A ring for a single percent, used as a compact KPI. */
export function Ring({ pct, size = 64, color = "var(--brand)", label }: { pct: number; size?: number; color?: string; label?: string }) {
  const r = (size - 8) / 2, c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="ring" style={{ width: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${p}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${(p / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={size * 0.26} fontWeight="700" fill="var(--ink)">{p}%</text>
      </svg>
      {label && <div className="ring-label">{label}</div>}
    </div>
  );
}
