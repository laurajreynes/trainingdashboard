import { NextResponse } from "next/server";

/**
 * Read-only bridge to the Call Box (Car Wars) client API, so call data can be pulled without anyone being
 * signed in to carwars.com. The API login lives in CARWARS_API_USER / CARWARS_API_PASS on Vercel and never
 * leaves the server. Same key as the other feeds: the hub passcode in the x-hub-key header. POST { op, ... }.
 *
 *   me                                         which Car Wars accounts this login can read
 *   fields { siteId, daysBack? }               field names and value types of a call record (no values)
 *   calls  { siteId, startDate?, endDate?, daysBack?, dnisType?, crispOutcome?, disposition?, limit?, offset? }
 *   crisp  { siteId, startDate?, endDate?, daysBack? }
 *
 * Customer phone numbers are masked to the last four digits before anything is returned.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BASE = "https://extclientapi.callbox.net";
type Body = Record<string, string | number | boolean | undefined>;

let cached: { token: string; until: number } | null = null;

async function token(): Promise<string> {
  if (cached && cached.until > Date.now() + 60_000) return cached.token;
  const username = process.env.CARWARS_API_USER;
  const password = process.env.CARWARS_API_PASS;
  if (!username || !password) throw new Error("CARWARS_API_USER or CARWARS_API_PASS is not set on Vercel");
  const r = await fetch(`${BASE}/user/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Car Wars login failed (${r.status})`);
  const j = (await r.json()) as { token?: { access_token?: string; expires_in?: number } };
  const t = j.token?.access_token;
  if (!t) throw new Error("Car Wars login returned no token");
  cached = { token: t, until: Date.now() + Math.max(60, Number(j.token?.expires_in) || 600) * 1000 };
  return t;
}

async function get(path: string, query: Record<string, string>): Promise<{ status: number; data: unknown }> {
  const qs = new URLSearchParams(query).toString();
  const r = await fetch(`${BASE}${path}${qs ? `?${qs}` : ""}`, {
    headers: { authorization: `Bearer ${await token()}` },
    cache: "no-store",
  });
  let data: unknown = null;
  try { data = await r.json(); } catch { data = null; }
  return { status: r.status, data };
}

const PHONE_KEY = /(^|_)(ani|caller|callerid|caller_id|customer|cust)(_|$)|phone|number/i;
const KEEP_KEY = /dnis|tracking|line|agent|staff|site|record|count|duration|id$/i;

/** Mask anything that looks like a customer phone number, at any depth. */
function scrub(v: unknown, key = ""): unknown {
  if (Array.isArray(v)) return v.map((x) => scrub(x, key));
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) o[k] = scrub(x, k);
    return o;
  }
  if ((typeof v === "string" || typeof v === "number") && PHONE_KEY.test(key) && !KEEP_KEY.test(key)) {
    const digits = String(v).replace(/\D/g, "");
    if (digits.length >= 10) return `***${digits.slice(-4)}`;
  }
  return v;
}

/** Field names and what kind of value each holds, with no values, so the shape can be read safely. */
function shape(rows: unknown[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    for (const [k, x] of Object.entries(row as Record<string, unknown>)) {
      const kind = x === null ? "null" : Array.isArray(x) ? `array(${x.length})` : typeof x === "object"
        ? `object{${Object.keys(x as object).slice(0, 12).join(",")}}`
        : typeof x === "string" ? `string(${x.length})` : typeof x;
      if (!out[k] || out[k] === "null" || out[k] === "string(0)") out[k] = kind;
    }
  }
  return out;
}

const pick = (b: Body, keys: string[]): Record<string, string> => {
  const q: Record<string, string> = {};
  for (const k of keys) if (b[k] !== undefined && b[k] !== "") q[k] = String(b[k]);
  return q;
};

export async function POST(req: Request) {
  let b: Body;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "JSON body required" }, { status: 400 }); }
  const pass = process.env.HUB_PASSCODE;
  if (!pass || req.headers.get("x-hub-key") !== pass) return NextResponse.json({ error: "no" }, { status: 401 });

  const site = Number(b.siteId);
  const needSite = () => (Number.isInteger(site) && site >= 4 ? null : NextResponse.json({ error: "siteId required" }, { status: 400 }));

  try {
    switch (b.op) {
      case "me": {
        const r = await get("/myUser", {});
        return NextResponse.json({ ok: r.status === 200, status: r.status, data: r.data });
      }
      case "fields": {
        const bad = needSite(); if (bad) return bad;
        const r = await get(`/call-log/siteId/${site}`, { daysBack: String(b.daysBack ?? 3), limit: "25" });
        const d = r.data as { callData?: unknown[]; callDataRecordCount?: number } | null;
        const rows = Array.isArray(d?.callData) ? d!.callData! : [];
        return NextResponse.json({ ok: r.status === 200, status: r.status, count: d?.callDataRecordCount ?? rows.length, fields: shape(rows) });
      }
      case "calls": {
        const bad = needSite(); if (bad) return bad;
        const q = pick(b, ["startDate", "endDate", "daysBack", "dnisType", "crispOutcome", "disposition", "minCallDurationSeconds", "limit", "offset"]);
        q.excludeSpam = "true";
        const r = await get(`/call-log/siteId/${site}`, q);
        return NextResponse.json({ ok: r.status === 200, status: r.status, data: scrub(r.data) });
      }
      case "crisp": {
        const bad = needSite(); if (bad) return bad;
        const r = await get(`/crisp-score/siteId/${site}`, pick(b, ["startDate", "endDate", "daysBack"]));
        const d = r.data as Record<string, unknown> | null;
        return NextResponse.json({ ok: r.status === 200, status: r.status, data: d ? { payload: d.payload, data: d.data } : null });
      }
      default:
        return NextResponse.json({ error: "unknown op" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 502 });
  }
}
