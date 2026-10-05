/** A forest that grows: one tree for every person trained this month. Colored by store when more than one store is in view. */
export function Forest({ trees, label }: { trees: { color: string; title: string }[]; label?: string }) {
  const W = 220, H = 70, ground = 60;
  const n = trees.length;
  const cols = Math.max(8, Math.min(24, n));
  const slot = (W - 16) / cols;
  // deterministic jitter so the forest looks natural but doesn't move between loads
  const j = (i: number, k: number) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
  return (
    <div className="forestwrap" title={label}>
      <svg className="forest" viewBox={`0 0 ${W} ${H}`} aria-label={label || "Trees for people trained this month"}>
        <path d={`M0 ${ground} Q ${W / 2} ${ground - 6} ${W} ${ground} L ${W} ${H} L 0 ${H} Z`} fill="var(--sage)" opacity=".5" />
        {n === 0 && <text x={W / 2} y={ground - 14} textAnchor="middle" className="forest-empty">No trees yet. Log a training.</text>}
        {trees.map((t, i) => {
          const row = n > cols ? i % 2 : 0;                 // two rows once it's crowded
          const x = 8 + (i % cols) * slot + slot / 2 + (j(i, 1) - 0.5) * slot * 0.5;
          const h = 22 + j(i, 2) * 16 - row * 6;
          const w = 9 + j(i, 3) * 5;
          const base = ground - row * 5 + (row ? 0 : 2);
          return (
            <g key={i} className="tree" style={{ animationDelay: `${(i % 7) * 0.4}s` }}>
              <title>{t.title}</title>
              <rect x={x - 1.2} y={base - h * 0.3} width="2.4" height={h * 0.3} fill="#7a5a3a" />
              <path d={`M${x} ${base - h} L${x + w / 2} ${base - h * 0.45} L${x - w / 2} ${base - h * 0.45} Z`} fill="var(--forest)" opacity={row ? 0.75 : 1} />
              <path d={`M${x} ${base - h * 0.78} L${x + w * 0.62} ${base - h * 0.22} L${x - w * 0.62} ${base - h * 0.22} Z`} fill={t.color} opacity={row ? 0.8 : 1} />
            </g>
          );
        })}
      </svg>
      {n > 0 && <div className="forest-count">{n} trained</div>}
    </div>
  );
}
