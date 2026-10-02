import "server-only";
import { db } from "./supabase";
import { daysInMonth, today } from "./fmt";

/** Targets per store (and location) for a month, kept as JSON in group_notes under targets:<month>. */
export type Target = { new: number | null; used: number | null };
export type Targets = Record<string, Target>;   // key: storeId or storeId|Location

export async function getTargets(month: string): Promise<Targets> {
  const r = await db().from("group_notes").select("body").eq("key", `targets:${month}`).maybeSingle();
  if (r.error || !r.data?.body) return {};
  try { return JSON.parse(r.data.body as string) as Targets; } catch { return {}; }
}

export function targetKey(storeId: string, location: string | null) { return location ? `${storeId}|${location}` : storeId; }

const HOLIDAYS: Record<string, string[]> = {
  "2026": ["2026-01-01", "2026-05-25", "2026-07-04", "2026-09-07", "2026-11-26", "2026-12-25"],
  "2027": ["2027-01-01", "2027-05-31", "2027-07-05", "2027-09-06", "2027-11-25", "2027-12-25"],
};

/** Selling days: Monday to Saturday, minus the big holidays. */
export function sellingDays(month: string): { total: number; done: number; remaining: number; dates: string[] } {
  const [y, m] = month.split("-").map(Number);
  const n = daysInMonth(month);
  const t = today();
  const hol = new Set(HOLIDAYS[String(y)] || []);
  const dates: string[] = [];
  for (let d = 1; d <= n; d++) {
    const iso = `${month}-${String(d).padStart(2, "0")}`;
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    if (dow !== 0 && !hol.has(iso)) dates.push(iso);
  }
  const done = dates.filter((d) => d <= t).length;
  return { total: dates.length, done, remaining: dates.length - done, dates };
}

/** Straight-line projection: MTD over days done, times the month's selling days. */
export function track(mtd: number, done: number, total: number): number {
  if (!done) return 0;
  return Math.round((mtd / done) * total);
}

export function trackClass(pct: number | null): string {
  if (pct === null) return "";
  return pct >= 100 ? "good" : pct >= 90 ? "warn" : "bad";
}


