import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import type { Activity } from "@/components/ActivityCard";

/**
 * Daily Activity feed. The scheduled Gmail job parses each store's DriveCentric Daily Activity Report
 * and posts it here. Each store's rows land in the `activity:<key>` group note (what the "Calls vs texts"
 * and "Where ups came from" cards read), and the goal entries keep the store goals moving without hand entry.
 *
 * Body: { stores: { [key]: Activity }, entries?: { store: string; goal: string; date: string; value: number; note?: string }[] }
 *   key   = store slug (chevrolet, toyota, subaru, livingston) or a location (belgrade, danhof)
 *   goal  = a fragment of the goal name, matched case-insensitively against the store's goals and its initiatives' goals
 * One entry per goal per date: posting the same date again replaces the value.
 */
export async function POST(req: Request) {
  if (req.headers.get("x-hub-key") !== process.env.HUB_PASSCODE) return NextResponse.json({ error: "no" }, { status: 401 });
  const body = (await req.json()) as { stores?: Record<string, Activity>; entries?: { store: string; goal: string; date: string; value: number; note?: string }[] };
  const out: Record<string, unknown> = {};

  for (const [key, act] of Object.entries(body.stores || {})) {
    if (!act || !Array.isArray(act.rows)) continue;
    const k = key.toLowerCase().replace(/[^a-z0-9-]/g, "");
    const r = await db().from("group_notes").upsert({ key: `activity:${k}`, body: JSON.stringify(act), updated_at: new Date().toISOString() }, { onConflict: "key" });
    out[`activity:${k}`] = r.error ? r.error.message : act.rows.length;
  }

  if (body.entries?.length) {
    const [stores, goals, inits] = await Promise.all([
      db().from("stores").select("id,slug,locations"),
      db().from("goals").select("id,name,store_id,initiative_id"),
      db().from("initiatives").select("id,store_ids"),
    ]);
    const storeFor = (key: string) => {
      const k = key.toLowerCase();
      return (stores.data || []).find((s) => s.slug === k) || (stores.data || []).find((s) => (s.locations || []).some((l: string) => l.toLowerCase() === k));
    };
    for (const e of body.entries) {
      const st = storeFor(e.store); if (!st) { out[`${e.store}/${e.goal}`] = "no store"; continue; }
      const initIds = new Set((inits.data || []).filter((i) => (i.store_ids || []).includes(st.id)).map((i) => i.id));
      const g = (goals.data || []).find((x) => (x.store_id === st.id || (x.initiative_id && initIds.has(x.initiative_id))) && x.name.toLowerCase().includes(e.goal.toLowerCase()));
      if (!g || typeof e.value !== "number" || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) { out[`${e.store}/${e.goal}`] = g ? "bad value or date" : "no goal"; continue; }
      await db().from("goal_entries").delete().eq("goal_id", g.id).eq("date", e.date);
      const r = await db().from("goal_entries").insert({ goal_id: g.id, date: e.date, value: e.value, note: e.note || "Daily Activity feed" });
      out[`${e.store}/${e.goal}`] = r.error ? r.error.message : `${e.value} on ${e.date}`;
    }
  }

  revalidatePath("/"); revalidatePath("/s/[slug]", "page"); revalidatePath("/s/[slug]/at/[loc]", "page"); revalidatePath("/i/[id]", "page");
  return NextResponse.json({ ok: true, result: out });
}
