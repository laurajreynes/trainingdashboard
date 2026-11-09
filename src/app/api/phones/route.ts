import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { cleanAccount, type PhoneMonth } from "@/lib/phones";
import { getPhoneMonths } from "@/lib/data";

/**
 * Phones feed. scripts/phones_pull.js runs in a signed-in Car Wars tab and posts each account's pull here.
 * A pull replaces that account for the month under the `phones:<month>` group note; the other account stays.
 *
 * Body: { month: "2026-11", account: "cct" | "subaru", data: <one account from phonesPull>, key?: string }
 * The key is the hub passcode, in the x-hub-key header or in the body. The body form plus the carwars.com
 * allow-origin header let the Car Wars tab post straight here and read the reply, so the numbers are never retyped.
 */
const CORS = { "Access-Control-Allow-Origin": "https://carwars.com", Vary: "Origin" };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: CORS });

export async function POST(req: Request) {
  let body: { month?: string; account?: string; data?: unknown; key?: string };
  try { body = await req.json(); } catch { return reply({ error: "JSON body required" }, 400); }
  const key = req.headers.get("x-hub-key") || body.key;
  if (!process.env.HUB_PASSCODE || key !== process.env.HUB_PASSCODE) return reply({ error: "no" }, 401);
  const month = body.month || "";
  const account = (body.account || "").toLowerCase();
  if (!/^\d{4}-\d{2}$/.test(month)) return reply({ error: "month must be YYYY-MM" }, 400);
  if (!/^[a-z0-9-]{2,24}$/.test(account)) return reply({ error: "account required" }, 400);
  const data = cleanAccount(body.data);
  if (typeof data === "string") return reply({ error: data }, 400);
  if (data.from.slice(0, 7) !== month) return reply({ error: "data.from is not in that month" }, 400);

  const k = `phones:${month}`;
  const cur = await db().from("group_notes").select("body").eq("key", k).maybeSingle();
  let stored: PhoneMonth = { month, accounts: {} };
  try { if (cur.data?.body) stored = JSON.parse(cur.data.body as string) as PhoneMonth; } catch { /* start the month over */ }
  // The account's own CRISP count is only readable some of the time: keep the last one when this pull has none
  if (!data.crisp && stored.accounts?.[account]?.crisp) data.crisp = stored.accounts[account].crisp;
  stored = { month, accounts: { ...(stored.accounts || {}), [account]: data } };
  const r = await db().from("group_notes").upsert({ key: k, body: JSON.stringify(stored), updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (r.error) return reply({ error: r.error.message }, 500);
  revalidatePath("/phones");
  return reply({ ok: true, month, account, people: data.agents.length, days: data.days?.length || 0, through: data.to });
}

export async function GET() {
  return NextResponse.json(await getPhoneMonths());
}
