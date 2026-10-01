import type { Store } from "@/lib/types";
import { storeAccent } from "@/lib/fmt";

type TreeRow = { store: Store; pct: number; sessions: number };

/** One tree per store. Height follows the share trained this month; a session adds a bird. The sun walks across the month. */
export function Grove({ rows, day, daysInMonth }: { rows: TreeRow[]; day: number; daysInMonth: number }) {
  const W = 420, H = 110, ground = 92;
  const n = Math.max(1, rows.length);
  const slot = (W - 40) / n;
  const sunX = 30 + ((day - 1) / Math.max(1, daysInMonth - 1)) * (W - 60);
  const sunY = 28 - Math.sin(((day - 1) / Math.max(1, daysInMonth - 1)) * Math.PI) * 14;
  return (
    <svg className="grove" viewBox={`0 0 ${W} ${H}`} aria-label="Training grove: one tree per store, taller as more people are trained">
      <circle className="sun" cx={sunX} cy={sunY} r="9" fill="var(--sun)" />
      <path d={`M0 ${ground} Q ${W / 2} ${ground - 8} ${W} ${ground} L ${W} ${H} L 0 ${H} Z`} fill="var(--sage)" opacity=".55" />
      {rows.map(({ store, pct, sessions }, i) => {
        const cx = 20 + slot * i + slot / 2;
        const grow = 0.3 + 0.7 * Math.min(1, pct / 100);     // sprout at 0, full tree at 100%
        const h = 62 * grow, w = 30 * (0.5 + 0.5 * grow);
        const c = storeAccent(store);
        return (
          <g key={store.id} className="tree">
            <rect x={cx - 2} y={ground - h * 0.35} width="4" height={h * 0.35} rx="1.5" fill="#7a5a3a" />
            <path d={`M${cx} ${ground - h} L${cx + w / 2} ${ground - h * 0.42} L${cx - w / 2} ${ground - h * 0.42} Z`} fill="var(--forest)" />
            <path d={`M${cx} ${ground - h * 0.82} L${cx + w * 0.62} ${ground - h * 0.22} L${cx - w * 0.62} ${ground - h * 0.22} Z`} fill="var(--brand)" />
            <circle cx={cx + w * 0.3} cy={ground - h * 0.5} r={Math.max(2, w * 0.1)} fill={c} />
            {Array.from({ length: Math.min(3, sessions) }, (_, k) => (
              <path key={k} d={`M${cx - 18 + k * 12} ${ground - h - 14 - k * 5} q 3 -4 6 0 q 3 -4 6 0`} fill="none" stroke="var(--ink-dim)" strokeWidth="1.2" strokeLinecap="round" />
            ))}
            <text className="label" x={cx} y={H - 3} textAnchor="middle">{store.short_name}</text>
          </g>
        );
      })}
    </svg>
  );
}
