/** Goals and rate formatting for the Phones tab. Kept apart from phones.ts so the browser code doesn't carry the stored numbers. */

/** Benchmarks. Inbound carries over from the Ring Ring dashboard. Outbound has none yet, so those cells stay uncolored. */
export const GOALS: { request: number; set: number; live: number | null; appt: number | null } = { request: 80, set: 45, live: null, appt: null };
/** Under this many calls a percentage is shown without a color: one call swings it too far. */
export const THIN = 5;

export const rate = (n: number, d: number): number | null => (d ? Math.round((n / d) * 100) : null);

/** Green at the goal, yellow within three quarters of it, red under that. No color without a goal or with too few calls. */
export function shade(pct: number | null, calls: number, goal: number | null): "" | "good" | "warn" | "bad" {
  if (pct === null || goal === null || calls < THIN) return "";
  return pct >= goal ? "good" : pct >= goal * 0.75 ? "warn" : "bad";
}
