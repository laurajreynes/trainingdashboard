import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";

/**
 * Editing for Laura's assistant, so the dash can be kept up from chat without signing in through the page.
 * Same key as the phones feed: the hub passcode in the x-hub-key header. POST { op, ...fields }.
 *
 *   visits      { from, to }                       sessions between two dates (YYYY-MM-DD), with store slug
 *   addVisit    { store, date, focus }             store = slug (chevrolet, toyota, subaru, sales-bdc, livingston)
 *   updateVisit { id, date?, focus?, store? }
 *   deleteVisit { id }
 *   getNote     { key }   setNote { key, body }    group notes, e.g. cwsetup:sales-bdc, away, gm_skip
 *   people      { q? }                             people whose name contains q
 *   deletePerson{ id }
 *   addTodo     { text, store?, due? }
 */
type Body = Record<string, string | undefined>;
const NOTE_OK = (k: string) =>
  ["mission", "vision", "values", "notes", "gm_skip", "carwars", "away", "marketing"].includes(k) ||
  /^(targets|cwsetup|stage|focus|activity|collection|playbook):/.test(k);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

async function storeId(slug?: string): Promise<string | null> {
  if (!slug) return null;
  const r = await db().from("stores").select("id").eq("slug", slug).maybeSingle();
  return (r.data as { id: string } | null)?.id ?? null;
}

export async function POST(req: Request) {
  let b: Body;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "JSON body required" }, { status: 400 }); }
  const pass = process.env.HUB_PASSCODE;
  if (!pass || req.headers.get("x-hub-key") !== pass) return NextResponse.json({ error: "no" }, { status: 401 });

  const done = (data: unknown = true) => { revalidatePath("/", "layout"); return NextResponse.json({ ok: true, data }); };
  const fail = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

  switch (b.op) {
    case "visits": {
      if (!b.from || !b.to || !DAY.test(b.from) || !DAY.test(b.to)) return fail("from and to required");
      const r = await db().from("visits").select("id,date,focus,store_id,stores(slug)").gte("date", b.from).lte("date", b.to).order("date");
      if (r.error) return fail(r.error.message, 500);
      return NextResponse.json({ ok: true, data: r.data });
    }
    case "addVisit": {
      const sid = await storeId(b.store);
      if (!sid) return fail("unknown store");
      if (!b.date || !DAY.test(b.date)) return fail("date required");
      const r = await db().from("visits").insert({ store_id: sid, date: b.date, focus: b.focus || null }).select("id").single();
      if (r.error) return fail(r.error.message, 500);
      return done(r.data);
    }
    case "updateVisit": {
      if (!b.id) return fail("id required");
      const patch: Record<string, string | null> = {};
      if (b.date) { if (!DAY.test(b.date)) return fail("bad date"); patch.date = b.date; }
      if (b.focus !== undefined) patch.focus = b.focus || null;
      if (b.store) { const sid = await storeId(b.store); if (!sid) return fail("unknown store"); patch.store_id = sid; }
      const r = await db().from("visits").update(patch).eq("id", b.id);
      if (r.error) return fail(r.error.message, 500);
      return done();
    }
    case "deleteVisit": {
      if (!b.id) return fail("id required");
      const r = await db().from("visits").delete().eq("id", b.id);
      if (r.error) return fail(r.error.message, 500);
      return done();
    }
    case "getNote": {
      if (!b.key || !NOTE_OK(b.key)) return fail("unknown note");
      const r = await db().from("group_notes").select("body,updated_at").eq("key", b.key).maybeSingle();
      return NextResponse.json({ ok: true, data: r.data });
    }
    case "setNote": {
      if (!b.key || !NOTE_OK(b.key)) return fail("unknown note");
      const r = await db().from("group_notes").upsert({ key: b.key, body: b.body ?? null, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (r.error) return fail(r.error.message, 500);
      return done();
    }
    case "people": {
      let q = db().from("people").select("id,name,active,store_id").order("name");
      if (b.q) q = q.ilike("name", `%${b.q}%`);
      const r = await q;
      if (r.error) return fail(r.error.message, 500);
      return NextResponse.json({ ok: true, data: r.data });
    }
    case "deletePerson": {
      if (!b.id) return fail("id required");
      const r = await db().from("people").delete().eq("id", b.id);
      if (r.error) return fail(r.error.message, 500);
      return done();
    }
    case "addTodo": {
      if (!b.text) return fail("text required");
      const r = await db().from("todos").insert({ text: b.text, store_id: await storeId(b.store), due: b.due || null });
      if (r.error) return fail(r.error.message, 500);
      return done();
    }
    default:
      return fail("unknown op");
  }
}
