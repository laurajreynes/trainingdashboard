import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { cleanAccount, type PhoneMonth } from "@/lib/phones";
import { getPhoneMonths } from "@/lib/data";

/**
 * Phones feed. scripts/phones_pull.js runs in a signed-in Car Wars tab, once per account, and its result is posted here.
 * Each account's pull replaces that account for the month under the `phones:<month>` group note; the other account stays.
 *
 * Body: { month: "2026-11", account: "cct" | "subaru", data: <what phonesPull returned>, key?: string }
 * The key is the hub passcode, in the x-hub-key header or in the body. The body form lets a plain cross-site POST work,
 * so the numbers can go straight from the Car Wars tab to the hub without being retyped.
 */
export async function POST(req: Request) {
  let body: { month?: string; account?: string; data?: unknown; key?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON body required" }, { status: 400 }); }
  const key = req.headers.get("x-hub-key") || body.key;
  if (!process.env.HUB_PASSCODE || key !== process.env.HUB_PASSCODE) return NextResponse.json({ error: "no" }, { status: 401 });
  const month = body.month || "";
  const account = (body.account || "").toLowerCase();
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "month must be YYYY-MM" }, { status: 400 });
  if (!/^[a-z0-9-]{2,24}$/.test(account)) return NextResponse.json({ error: "account required" }, { status: 400 });
  const data = cleanAccount(body.data);
  if (typeof data === "string") return NextResponse.json({ error: data }, { status: 400 });
  if (data.from.slice(0, 7) !== month) return NextResponse.json({ error: "data.from is not in that month" }, { status: 400 });

  const k = `phones:${month}`;
  const cur = await db().from("group_notes").select("body").eq("key", k).maybeSingle();
  let stored: PhoneMonth = { month, accounts: {} };
  try { if (cur.data?.body) stored = JSON.parse(cur.data.body as string) as PhoneMonth; } catch { /* start the month over */ }
  stored = { month, accounts: { ...(stored.accounts || {}), [account]: data } };
  const r = await db().from("group_notes").upsert({ key: k, body: JSON.stringify(stored), updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 });
  revalidatePath("/phones");
  return NextResponse.json({ ok: true, month, account, people: data.agents.length, through: data.to });
}

export async function GET() {
  return NextResponse.json(await getPhoneMonths());
}
