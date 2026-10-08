import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export type BulletinItem = {
  id: string;            // gmail thread id, used to dedupe
  date: string;          // YYYY-MM-DD
  from: string;          // who sent it (Caroline, Owen)
  subject: string;
  note: string;          // what marketing flagged, in a sentence
  interest?: string;     // what the customer seems to want
  store?: string;        // store short name if known
  person?: string;       // salesperson or BDC agent named
  url?: string;          // link back to the email
};

/** Marketing bulletin: items posted by the scheduled Gmail scan. POST merges by id; the key is the hub passcode. */
export async function POST(req: Request) {
  if (req.headers.get("x-hub-key") !== process.env.HUB_PASSCODE) return NextResponse.json({ error: "no" }, { status: 401 });
  const body = (await req.json()) as { items: BulletinItem[] };
  if (!Array.isArray(body.items)) return NextResponse.json({ error: "items[] required" }, { status: 400 });
  const cur = await db().from("group_notes").select("body").eq("key", "bulletin").maybeSingle();
  let items: BulletinItem[] = [];
  try { items = cur.data?.body ? JSON.parse(cur.data.body as string) : []; } catch { items = []; }
  const byId = new Map(items.map((i) => [i.id, i]));
  for (const it of body.items) if (it.id && it.subject) byId.set(it.id, { ...byId.get(it.id), ...it });
  const merged = [...byId.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60);
  const r = await db().from("group_notes").upsert({ key: "bulletin", body: JSON.stringify(merged), updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 });
  revalidatePath("/"); revalidatePath("/s/[slug]", "page");
  return NextResponse.json({ ok: true, count: merged.length });
}

export async function GET() {
  const cur = await db().from("group_notes").select("body").eq("key", "bulletin").maybeSingle();
  try { return NextResponse.json(cur.data?.body ? JSON.parse(cur.data.body as string) : []); } catch { return NextResponse.json([]); }
}
