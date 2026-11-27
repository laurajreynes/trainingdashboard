import "server-only";
import { db } from "./supabase";

/**
 * Who opens what. One group note per day, key hits:<YYYY-MM-DD> (Bozeman date), holding a small JSON tally.
 * "me" is Laura (signed in as editor on the dash, or a device she marked as hers on a board). "team" is everyone else.
 */
export type Side = { v: number; c: Record<string, number>; u?: string[] };
export type DayHits = Record<string, { me: Side; team: Side }>;   // key: "<site> <path>"

export async function getHits(day: string): Promise<DayHits> {
  const r = await db().from("group_notes").select("body").eq("key", `hits:${day}`).maybeSingle();
  if (r.error || !r.data?.body) return {};
  try { return JSON.parse(r.data.body as string) as DayHits; } catch { return {}; }
}

export async function addHit(day: string, h: { site: string; path: string; kind: "view" | "click"; label: string; vid: string; me: boolean }): Promise<void> {
  const cur = await getHits(day);
  const k = `${h.site} ${h.path}`;
  if (!cur[k] && Object.keys(cur).length >= 300) return;                    // keep one day's note small
  const row = cur[k] || (cur[k] = { me: { v: 0, c: {} }, team: { v: 0, c: {}, u: [] } });
  const side = h.me ? row.me : row.team;
  if (h.kind === "view") {
    side.v += 1;
    if (!h.me && h.vid) { const u = side.u || (side.u = []); if (!u.includes(h.vid) && u.length < 60) u.push(h.vid); }
  } else if (h.label) {
    if (side.c[h.label] !== undefined || Object.keys(side.c).length < 40) side.c[h.label] = (side.c[h.label] || 0) + 1;
  }
  await db().from("group_notes").upsert({ key: `hits:${day}`, body: JSON.stringify(cur), updated_at: new Date().toISOString() }, { onConflict: "key" });
}
