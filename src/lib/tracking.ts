import "server-only";
import { db } from "./supabase";
import { sellingDates, today } from "./fmt";

/** Targets per store (and location) for a month, kept as JSON in group_notes under targets:<month>. */
export type Target = { new: number | null; used: number | null; mapNew?: number | null; mapUsed?: number | null };  // map = minimum acceptable performance
export type Targets = Record<string, Target>;   // key: storeId or storeId|Location

export async function getTargets(month: string): Promise<Targets> {
  const r = await db().from("group_notes").select("body").eq("key", `targets:${month}`).maybeSingle();
  if (r.error || !r.data?.body) return {};
  try { return JSON.parse(r.data.body as string) as Targets; } catch { return {}; }
}

/** Gross month to date per store row, kept as JSON under gross:<month>. FE = front end, BE = back end. */
export type Gross = { newFe: number | null; newBe: number | null; usedFe: number | null; usedBe: number | null };
export async function getGross(month: string): Promise<Record<string, Gross>> {
  const r = await db().from("group_notes").select("body").eq("key", `gross:${month}`).maybeSingle();
  if (r.error || !r.data?.body) return {};
  try { return JSON.parse(r.data.body as string) as Record<string, Gross>; } catch { return {}; }
}
export const money = (n: number) => (n < 0 ? "-$" : "$") + Math.round(Math.abs(n)).toLocaleString("en-US");

export function targetKey(storeId: string, location: string | null) { return location ? `${storeId}|${location}` : storeId; }

/** Selling days: Monday to Saturday, minus the big holidays. */
export function sellingDays(month: string): { total: number; done: number; remaining: number; dates: string[] } {
  const t = today();
  const dates = sellingDates(month);
  const done = dates.filter((d) => d < t).length;   // today is still in progress
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


