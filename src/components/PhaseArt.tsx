import type { Phase } from "@/lib/month";

/** A little scene for each part of the month: sunrise to start, the trail mid-month, the summit flag at the close. */
export function PhaseArt({ phase, color }: { phase: Phase; color?: string }) {
  const c = color || "var(--phase-color)";
  if (phase === "reflect") return (
    <svg className="phaseart" viewBox="0 0 160 70" aria-hidden="true">
      <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c} stopOpacity=".18" /><stop offset="1" stopColor={c} stopOpacity="0" /></linearGradient></defs>
      <rect width="160" height="70" rx="10" fill="url(#sky)" />
      <circle cx="112" cy="40" r="13" fill={c} opacity=".85" />
      {[0, 1, 2, 3, 4].map((i) => <line key={i} x1="112" y1="40" x2={112 + 24 * Math.cos((-150 + i * 30) * Math.PI / 180)} y2={40 + 24 * Math.sin((-150 + i * 30) * Math.PI / 180)} stroke={c} strokeWidth="1.5" opacity=".5" strokeLinecap="round" />)}
      <path d="M0 62 L30 34 L48 50 L72 24 L98 52 L120 40 L160 62 Z" fill="var(--forest)" opacity=".85" />
      <path d="M0 62 L22 46 L40 56 L60 44 L84 58 L110 50 L160 62 Z" fill="var(--forest)" />
      <path d="M66 31 L72 24 L78 31 Z" fill="#fff" opacity=".8" />
    </svg>
  );
  if (phase === "track") return (
    <svg className="phaseart" viewBox="0 0 160 70" aria-hidden="true">
      <path d="M6 60 C 40 60, 40 30, 80 30 S 120 12, 154 12" fill="none" stroke="var(--forest)" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 6" opacity=".55" />
      {[[6, 60], [44, 43], [80, 30], [118, 21]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5" fill={i < 2 ? c : "#fff"} stroke={c} strokeWidth="2" />)}
      <g transform="translate(150 12)"><path d="M0 0 L0 -12" stroke="var(--forest)" strokeWidth="2" /><path d="M0 -12 L12 -8 L0 -4 Z" fill={c} /></g>
      <path d="M20 68 L26 56 L32 68 Z M40 68 L45 60 L50 68 Z" fill="var(--forest)" opacity=".6" />
    </svg>
  );
  return (
    <svg className="phaseart" viewBox="0 0 160 70" aria-hidden="true">
      <path d="M10 66 L60 14 L80 30 L100 10 L150 66 Z" fill="var(--forest)" />
      <path d="M94 16 L100 10 L106 16 L104 20 L96 20 Z" fill="#fff" opacity=".85" />
      <g transform="translate(100 10)"><path d="M0 0 L0 -22" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" /><path d="M0 -22 L16 -17 L0 -12 Z" fill={c} /></g>
      {[[20, 20], [36, 10], [130, 18], [142, 30], [120, 8]].map(([x, y], i) => <path key={i} d={`M${x} ${y} l2 -2 l2 2 l-2 2 Z`} fill={c} opacity=".8" />)}
    </svg>
  );
}
