import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";

/**
 * Field Guide visit notes -> the dash.
 * Field Guide keeps a note per visit block (state key fg2_note_<YYYY-MM-DD>_<block title>) in its public
 * /api/state. When Laura saves a note there, Field Guide pings this route. We pull the notes from the last
 * week, match each to that day's visit at the same store, keep the raw note as the visit's private notes,
 * and write a cleaned-up recap into the visit's shareable summary.
 * Nothing secret comes in: the only input is Field Guide's own state, so a stray call just re-syncs.
 */
const FG = "https://field-guide-assist.vercel.app/api/state";
const MODEL = "anthropic/claude-haiku-5.5";
const STORES: [RegExp, string][] = [
  [/\bbdc\b/i, "sales-bdc"],
  [/toyota|\btle\b/i, "toyota"],
  [/chevy|chevrolet|cadillac|belgrade|danhof/i, "chevrolet"],
  [/subaru/i, "subaru"],
  [/livingston/i, "livingston"],
];

const PROMPT = `You turn a car dealership trainer's quick visit notes into a short recap the store's managers can read.
Write 2 to 5 short lines, each starting with "- ". Plain, warm and specific.
Keep names, numbers, what people committed to, and follow-ups. Fix typos and shorthand.
Do not invent anything that is not in the notes.
Leave out private opinions about a person's attitude or ability. Those stay in her private notes.
No em dashes, no semicolons, no filler words like "furthermore". Do not add a heading or sign-off.
If nothing in the notes is shareable, reply with an empty message.`;

let lastErr = "";
async function recap(note: string, oidc: string | null): Promise<string | null> {
  const key = process.env.AI_GATEWAY_API_KEY || oidc || process.env.VERCEL_OIDC_TOKEN;
  if (!key) { lastErr = "no key or oidc token"; return null; }
  try {
    const r = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: MODEL, max_tokens: 400, messages: [{ role: "system", content: PROMPT }, { role: "user", content: note }] }),
    });
    if (!r.ok) { lastErr = `gateway ${r.status}: ${(await r.text()).slice(0, 200)}`; return null; }
    const j = await r.json();
    const t = String(j?.choices?.[0]?.message?.content ?? "").replace(/—/g, ", ").trim();
    return t;
  } catch (e) { lastErr = String(e).slice(0, 200); return null; }
}

async function run(req: Request) {
  const oidc = req.headers.get("x-vercel-oidc-token");
  let state: Record<string, { v: string; ts: number }> = {};
  try { const r = await fetch(`${FG}?x=${Date.now()}`, { cache: "no-store" }); state = (await r.json())?.state ?? {}; }
  catch { return NextResponse.json({ ok: false, error: "could not read Field Guide" }, { status: 502 }); }

  const since = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const stores = (await db().from("stores").select("id,slug")).data as { id: string; slug: string }[] | null;
  const sid = (slug: string) => stores?.find((s) => s.slug === slug)?.id ?? null;
  const out: { date: string; title: string; did: string }[] = [];

  for (const [k, rec] of Object.entries(state)) {
    const m = k.match(/^fg2_note_(\d{4}-\d{2}-\d{2})_(.+)$/);
    if (!m || m[1] < since) continue;
    const date = m[1], title = m[2], note = String(rec?.v ?? "").trim();
    if (!note) continue;
    const slug = STORES.find(([re]) => re.test(title))?.[1];
    const store_id = slug ? sid(slug) : null;
    if (!store_id) { out.push({ date, title, did: "no store" }); continue; }

    const found = await db().from("visits").select("id,private_notes,summary").eq("store_id", store_id).eq("date", date).order("created_at").limit(1);
    let v = (found.data?.[0] as { id: string; private_notes: string | null; summary: string | null } | undefined) ?? null;
    if (v && (v.private_notes ?? "").trim() === note) { out.push({ date, title, did: "unchanged" }); continue; }
    if (!v) {
      const ins = await db().from("visits").insert({ store_id, date, focus: title }).select("id,private_notes,summary").single();
      if (ins.error) { out.push({ date, title, did: "insert failed" }); continue; }
      v = ins.data as { id: string; private_notes: string | null; summary: string | null };
    }
    const sum = await recap(note, oidc);
    const patch: Record<string, string> = { private_notes: note };
    if (sum !== null) patch.summary = sum;
    await db().from("visits").update(patch).eq("id", v.id);
    out.push({ date, title, did: sum === null ? `notes saved, recap failed (${lastErr})` : "synced" });
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, results: out });
}

export async function POST(req: Request) { return run(req); }
export async function GET(req: Request) { return run(req); }
