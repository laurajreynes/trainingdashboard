import { NextResponse } from "next/server";
import { isEditor } from "@/lib/auth";
import { today } from "@/lib/fmt";
import { addHit } from "@/lib/hits";

/**
 * Visit and click counting for the hub and the store boards.
 * Body (JSON, sent as text so a plain beacon works): { site, path, kind: "view" | "click", label?, vid?, me? }
 * The hub's own pages post here from the Track component. The store boards post here from their own sites,
 * which is why any origin is allowed. Nothing personal comes in: a page, a button label, and a random device id.
 */
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type" };
const clean = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }

export async function POST(req: Request) {
  let b: Record<string, unknown> = {};
  try { b = JSON.parse(await req.text()) as Record<string, unknown>; } catch { return NextResponse.json({ ok: false }, { status: 400, headers: CORS }); }
  const site = clean(b.site, 24).toLowerCase().replace(/[^a-z0-9-]/g, "");
  const path = clean(b.path, 80).split("?")[0] || "/";
  const kind = b.kind === "click" ? "click" : "view";
  if (!site) return NextResponse.json({ ok: false }, { status: 400, headers: CORS });
  let me = b.me === true;
  if (site === "hub") { try { me = await isEditor(); } catch { me = false; } }
  try { await addHit(today(), { site, path, kind, label: clean(b.label, 40), vid: clean(b.vid, 16), me }); }
  catch { return NextResponse.json({ ok: false }, { status: 500, headers: CORS }); }
  return NextResponse.json({ ok: true }, { headers: CORS });
}
