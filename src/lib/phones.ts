import { PHONES_SEED } from "./phones-seed";

/**
 * Phones tab: inbound and outbound phone performance by team, from Car Wars.
 *
 * Car Wars has two accounts. Gallatin Subaru is its own. Chevrolet, Toyota, Belgrade, Danhof and the Ressler BDC share
 * one, and CRISP has no team filter (asking its feed for one group returns that group plus every unclaimed call in the
 * account). So every line here is built the same way: each person's counts from Car Wars Staff Activity, added up by the
 * Car Wars group they are in. Calls nobody has claimed are not on any line; when the account's own CRISP count was
 * readable at pull time it shows under "How this adds up".
 *
 * Counts per person: io inbound sales calls, ir appointment requests, fi firm appointments,
 * oc outbound calls, ol outbound live conversations, os outbound appointments set.
 */

export type PhoneCounts = { io: number; ir: number; fi: number; oc: number; ol: number; os: number };
export type PhoneAgent = PhoneCounts & { n: string; g: string[] };
/** One day of outbound per person: [calls, live conversations, appointments set]. */
export type PhoneDay = { d: string; a: Record<string, [number, number, number]> };
/** The account's own CRISP counts (these include unclaimed calls), and how many of them were unclaimed. */
export type PhoneCrisp = { io: number; ir: number; fi: number; uio: number; uir: number; at: string };
export type PhoneAccount = { from: string; to: string; pulled: string; agents: PhoneAgent[]; days?: PhoneDay[]; crisp?: PhoneCrisp };
export type PhoneMonth = { month: string; accounts: Record<string, PhoneAccount> };

const TZ = "America/Denver";
/** Benchmarks. Inbound carries over from the Ring Ring dashboard. Outbound has none yet, so those cells stay uncolored. */
export const GOALS: { request: number; set: number; live: number | null; appt: number | null } = { request: 80, set: 45, live: null, appt: null };
/** Under this many calls a percentage is shown without a color: one call swings it too far. */
export const THIN = 5;
/** A day counts as finished once the pull happened at or after this hour, Mountain time. */
const DAY_DONE_HOUR = 19;

export type TeamDef = { key: string; name: string; account: string; group?: string; href: string; color: string };
export const TEAMS: TeamDef[] = [
  { key: "subaru", name: "Gallatin Subaru", account: "subaru", href: "/s/subaru", color: "var(--store-subaru)" },
  { key: "bdc", name: "Ressler BDC", account: "cct", group: "BDC (default)", href: "/s/sales-bdc", color: "var(--store-sales-bdc)" },
  { key: "toyota", name: "Toyota", account: "cct", group: "Toyota", href: "/s/toyota", color: "var(--store-toyota)" },
  { key: "chevrolet", name: "Chevrolet", account: "cct", group: "Chevrolet", href: "/s/chevrolet", color: "var(--store-chevrolet)" },
  { key: "belgrade", name: "Belgrade", account: "cct", group: "Belgrade", href: "/s/chevrolet/at/belgrade", color: "var(--store-chevrolet)" },
  { key: "danhof", name: "Danhof", account: "cct", group: "Danhof", href: "/s/chevrolet/at/danhof", color: "var(--store-chevrolet)" },
];
export const ACCOUNT_NAME: Record<string, string> = { cct: "Chevrolet Cadillac Toyota", subaru: "Gallatin Subaru" };

/** Car Wars groups that hold managers. Someone also in a store's own group (Belgrade, Toyota...) counts with that store. */
const MANAGER_GROUPS = ["New Car Sales (default)", "Used Car Sales (default)", "Sales Manager (default)"];
/** Never a salesperson row: the trainer, the AI agent's login, managers who aren't in a manager group. */
const NOT_STAFF = [/^laura reynes$/i, /^genius user/i, /^russ stump$/i, /^sean skelton$/i, /^troy mossing$/i];
/** BDC people Car Wars doesn't have in a BDC group yet. They stay on inbound and come out of the floor's outbound. */
const ALSO_BDC = [/^halie monroe$/i];

const notStaff = (a: PhoneAgent) => NOT_STAFF.some((r) => r.test(a.n)) || a.g.some((g) => /service/i.test(g));
const isManager = (a: PhoneAgent) => a.g.some((g) => MANAGER_GROUPS.includes(g));
export const isBdc = (a: PhoneAgent) => a.g.includes("BDC (default)") || ALSO_BDC.some((r) => r.test(a.n));

const ZERO: PhoneCounts = { io: 0, ir: 0, fi: 0, oc: 0, ol: 0, os: 0 };
const add = (a: PhoneCounts, b: PhoneCounts): PhoneCounts => ({ io: a.io + b.io, ir: a.ir + b.ir, fi: a.fi + b.fi, oc: a.oc + b.oc, ol: a.ol + b.ol, os: a.os + b.os });
const sum = (list: PhoneCounts[]) => list.reduce(add, ZERO);

/** Which team a person in the shared account counts with: their store's group first, the BDC otherwise. */
export function teamOf(a: PhoneAgent): string | null {
  if (notStaff(a)) return null;
  const store = TEAMS.find((t) => t.group && t.key !== "bdc" && a.g.includes(t.group));
  if (store) return store.key;
  if (a.g.includes("BDC (default)")) return "bdc";
  return null;
}

// ---------- dates (plain YYYY-MM-DD strings, no time zones involved) ----------

const toDate = (iso: string) => new Date(`${iso}T12:00:00Z`);
const toIso = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => { const d = toDate(iso); d.setUTCDate(d.getUTCDate() + n); return toIso(d); };
const dow = (iso: string) => toDate(iso).getUTCDay(); // 0 Sunday
const mondayOf = (iso: string) => addDays(iso, -((dow(iso) + 6) % 7));
/** Selling days from a through b, both included. The stores are closed Sundays. */
export function workDays(a: string, b: string): number {
  let n = 0;
  for (let d = a; d <= b; d = addDays(d, 1)) if (dow(d) !== 0) n++;
  return n;
}
/** The last day in a pull that was a whole day: the pull day itself only when it ran in the evening. */
export function lastFullDay(a: PhoneAccount): string {
  const hour = Number(new Date(a.pulled).toLocaleString("en-US", { timeZone: TZ, hour: "numeric", hour12: false })) % 24;
  const pulledDay = new Date(a.pulled).toLocaleDateString("en-CA", { timeZone: TZ });
  return a.to < pulledDay || hour >= DAY_DONE_HOUR ? a.to : addDays(a.to, -1);
}

// ---------- the view ----------

export type TeamRow = PhoneCounts & {
  team: TeamDef;
  people: PhoneAgent[];
  /** Outbound calls per selling day this month, whole days only. Null until there is a whole day. */
  perDay: number | null;
  /** The same per person, by name. */
  perDayBy: Record<string, number>;
  /** Subaru only: people whose outbound is left off the line (the BDC). */
  bdc: Set<string>;
};
export type TrendWeek = { start: string; total: number; days: number; avg: number | null; partial: boolean };
export type PhoneView = {
  month: string; from: string; to: string; pulled: string;
  rows: TeamRow[];
  /** Outbound calls per selling day by week, the same weeks for every team. */
  trend: { team: TeamDef; weeks: TrendWeek[] }[];
  accounts: { key: string; name: string; claimed: PhoneCounts; crisp: PhoneCrisp | null; other: PhoneCounts; teams: number }[];
};

/** The people a team's outbound counts: the group for a shared-account team, the sales floor for a whole account. */
function outboundMembers(t: TeamDef, acct: PhoneAccount): PhoneAgent[] {
  if (t.group) return acct.agents.filter((a) => teamOf(a) === t.key);
  return acct.agents.filter((a) => !notStaff(a) && !isManager(a) && !isBdc(a));
}

/** Outbound calls by day for one team, across every stored month. */
function teamDaily(t: TeamDef, months: Record<string, PhoneMonth>): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of Object.values(months)) {
    const acct = m.accounts[t.account];
    if (!acct?.days) continue;
    const names = new Set(outboundMembers(t, acct).map((a) => a.n));
    const full = lastFullDay(acct);
    for (const day of acct.days) {
      if (day.d > full) continue;
      let n = 0;
      for (const [name, v] of Object.entries(day.a)) if (names.has(name)) n += v[0];
      out.set(day.d, (out.get(day.d) || 0) + n);
    }
  }
  return out;
}

const TREND_WEEKS = 6;

export function buildView(months: Record<string, PhoneMonth>, month: string): PhoneView {
  const m = months[month];
  const rows: TeamRow[] = [];
  const accounts: PhoneView["accounts"] = [];
  const byPeople = (a: PhoneAgent, b: PhoneAgent) => b.io - a.io || b.ir - a.ir || b.oc - a.oc || a.n.localeCompare(b.n);

  for (const [key, acct] of Object.entries(m.accounts)) {
    const teams = TEAMS.filter((t) => t.account === key);
    const counted = new Set<string>();
    const full = lastFullDay(acct);
    const monthDays = (acct.days || []).filter((d) => d.d <= full);
    for (const t of teams) {
      const members = outboundMembers(t, acct);
      // People listed on the line: the group, or for a whole account everyone but managers (the BDC stays for inbound)
      const people = (t.group ? members : acct.agents.filter((a) => !notStaff(a) && !isManager(a))).slice().sort(byPeople);
      people.forEach((p) => counted.add(p.n));
      // Inbound for a whole account is every claimed call in it, whoever took it. Outbound is the members only.
      const inbound = t.group ? sum(people) : sum(acct.agents);
      const outbound = sum(members);
      const memberNames = new Set(members.map((p) => p.n));
      const firstDay = monthDays.find((d) => Object.entries(d.a).some(([n, v]) => memberNames.has(n) && v[0] > 0))?.d;
      const selling = firstDay && full >= firstDay ? workDays(firstDay < acct.from ? acct.from : firstDay, full) : 0;
      const perDayBy: Record<string, number> = {};
      let fullCalls = 0;
      if (selling) {
        for (const d of monthDays) for (const [n, v] of Object.entries(d.a)) {
          if (memberNames.has(n)) fullCalls += v[0];
          perDayBy[n] = (perDayBy[n] || 0) + v[0];
        }
        for (const n of Object.keys(perDayBy)) perDayBy[n] = perDayBy[n] / selling;
      }
      rows.push({
        team: t, io: inbound.io, ir: inbound.ir, fi: inbound.fi, oc: outbound.oc, ol: outbound.ol, os: outbound.os,
        people, perDay: selling ? fullCalls / selling : null, perDayBy,
        bdc: t.group ? new Set() : new Set(people.filter(isBdc).map((p) => p.n)),
      });
    }
    const others = acct.agents.filter((a) => !counted.has(a.n));
    accounts.push({ key, name: ACCOUNT_NAME[key] || key, claimed: sum(acct.agents), crisp: acct.crisp || null, other: sum(others), teams: teams.length });
  }
  rows.sort((a, b) => TEAMS.indexOf(a.team) - TEAMS.indexOf(b.team));
  accounts.sort((a, b) => TEAMS.findIndex((t) => t.account === a.key) - TEAMS.findIndex((t) => t.account === b.key));

  // Weekly trend: the last few Monday-to-Saturday weeks up to the newest whole day anywhere
  const dailies = TEAMS.map((t) => ({ team: t, daily: teamDaily(t, months) }));
  const newest = dailies.flatMap((x) => [...x.daily.keys()]).sort().pop();
  const trend: PhoneView["trend"] = [];
  if (newest) {
    const lastWeek = mondayOf(newest);
    const starts = Array.from({ length: TREND_WEEKS }, (_, i) => addDays(lastWeek, -7 * (TREND_WEEKS - 1 - i)));
    for (const { team, daily } of dailies) {
      const live = [...daily.entries()].filter(([, n]) => n > 0).map(([d]) => d).sort();
      const first = live[0], last = [...daily.keys()].sort().pop();
      const weeks = starts.map((start): TrendWeek => {
        const end = addDays(start, 6);
        if (!first || !last || end < first || start > last) return { start, total: 0, days: 0, avg: null, partial: false };
        const a = start < first ? first : start, b = end > last ? last : end;
        let total = 0;
        for (let d = a; d <= b; d = addDays(d, 1)) total += daily.get(d) || 0;
        const days = workDays(a, b);
        return { start, total, days, avg: days ? total / days : null, partial: b < addDays(start, 5) && last <= end };
      });
      trend.push({ team, weeks });
    }
    // Drop the leading weeks from before anyone was on Car Wars
    const lead = starts.findIndex((_, i) => trend.some((t) => t.weeks[i].avg !== null));
    if (lead > 0) for (const t of trend) t.weeks = t.weeks.slice(lead);
  }

  const all = Object.values(m.accounts);
  return {
    month,
    from: all.map((a) => a.from).sort()[0] || `${month}-01`,
    to: all.map((a) => a.to).sort().pop() || `${month}-01`,
    pulled: all.map((a) => a.pulled).sort().pop() || "",
    rows, trend, accounts,
  };
}

export const rate = (n: number, d: number): number | null => (d ? Math.round((n / d) * 100) : null);

/** Green at the goal, yellow within three quarters of it, red under that. No color without a goal or with too few calls. */
export function shade(pct: number | null, calls: number, goal: number | null): "" | "good" | "warn" | "bad" {
  if (pct === null || goal === null || calls < THIN) return "";
  return pct >= goal ? "good" : pct >= goal * 0.75 ? "warn" : "bad";
}

// ---------- reading the stored months ----------

/** The starting numbers came from the account CRISP feed, which carries an "Unclaimed" row and the account total. */
function parseSeed(text: string): Record<string, PhoneMonth> {
  const out: Record<string, PhoneMonth> = {};
  for (const block of text.trim().split(/\n\s*\n/)) {
    const [head, ...lines] = block.trim().split("\n");
    const [left, right] = head.split("|").map((s) => s.trim());
    const [month, account, from, to, pulled] = left.split(/\s+/);
    const t = right.split(",").map(Number);
    const all = lines.map((l) => {
      const p = l.split("|");
      return { n: p[0], g: p[1] ? p[1].split("+") : [], io: +p[2], ir: +p[3], fi: +p[4], oc: +p[5], ol: +p[6], os: +p[7] };
    });
    const unclaimed = all.find((a) => a.n === "Unclaimed");
    out[month] = out[month] || { month, accounts: {} };
    out[month].accounts[account] = {
      from, to, pulled, agents: all.filter((a) => a.n !== "Unclaimed"),
      crisp: { io: t[0], ir: t[1], fi: t[2], uio: unclaimed?.io || 0, uir: unclaimed?.ir || 0, at: pulled },
    };
  }
  return out;
}

export const seedMonths = (): Record<string, PhoneMonth> => parseSeed(PHONES_SEED);

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
function cleanCounts(v: unknown): PhoneCounts | null {
  const o = (v || {}) as Record<string, unknown>;
  const c = { io: num(o.io), ir: num(o.ir), fi: num(o.fi), oc: num(o.oc), ol: num(o.ol), os: num(o.os) };
  return Object.values(c).some((x) => x === null) ? null : (c as PhoneCounts);
}
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Checks a posted account pull and returns it in the stored shape, or says what is wrong with it. */
export function cleanAccount(v: unknown): PhoneAccount | string {
  const o = (v || {}) as Record<string, unknown>;
  if (!Array.isArray(o.agents) || o.agents.length < 3) return "agents[] required";
  const agents: PhoneAgent[] = [];
  for (const a of o.agents as Record<string, unknown>[]) {
    const c = cleanCounts(a);
    if (!c || typeof a.n !== "string" || !a.n.trim()) return `bad agent row: ${JSON.stringify(a).slice(0, 80)}`;
    if (a.n.trim() === "Unclaimed") continue;
    agents.push({ n: a.n.trim().slice(0, 80), g: Array.isArray(a.g) ? (a.g as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 8) : [], ...c });
  }
  if (typeof o.from !== "string" || typeof o.to !== "string" || !ISO_DAY.test(o.from) || !ISO_DAY.test(o.to)) return "from and to must be YYYY-MM-DD";
  const out: PhoneAccount = { from: o.from, to: o.to, pulled: typeof o.pulled === "string" && !Number.isNaN(Date.parse(o.pulled)) ? o.pulled : new Date().toISOString(), agents };

  if (o.days !== undefined) {
    if (!Array.isArray(o.days)) return "days must be a list";
    const days: PhoneDay[] = [];
    for (const d of o.days as Record<string, unknown>[]) {
      if (typeof d?.d !== "string" || !ISO_DAY.test(d.d) || typeof d.a !== "object" || !d.a) return "each day needs d and a";
      const a: PhoneDay["a"] = {};
      for (const [name, val] of Object.entries(d.a as Record<string, unknown>)) {
        if (!Array.isArray(val) || val.length !== 3 || val.some((x) => num(x) === null)) return `bad day row ${d.d} ${name}`;
        a[name.slice(0, 80)] = [val[0], val[1], val[2]] as [number, number, number];
      }
      days.push({ d: d.d, a });
    }
    out.days = days.sort((x, y) => x.d.localeCompare(y.d));
    // The days have to add back up to the month: a pull where they don't is a bad pull, not a new number.
    // A few calls can land between the month read and the day reads, so allow a small gap.
    const dayCalls = days.reduce((s, d) => s + Object.values(d.a).reduce((x, v) => x + v[0], 0), 0);
    const monthCalls = agents.reduce((s, a) => s + a.oc, 0);
    if (Math.abs(dayCalls - monthCalls) > Math.max(10, monthCalls * 0.03)) return `days add up to ${dayCalls} outbound calls but the month says ${monthCalls}`;
  }
  if (o.crisp) {
    const c = o.crisp as Record<string, unknown>;
    const v5 = [num(c.io), num(c.ir), num(c.fi), num(c.uio), num(c.uir)];
    if (v5.some((x) => x === null)) return "crisp needs io, ir, fi, uio, uir";
    out.crisp = { io: v5[0]!, ir: v5[1]!, fi: v5[2]!, uio: v5[3]!, uir: v5[4]!, at: out.pulled };
  }
  return out;
}

/** Stored pulls laid over the starting numbers, month by month and account by account. */
export function mergeMonths(stored: { key: string; body: string | null }[]): Record<string, PhoneMonth> {
  const out = seedMonths();
  for (const row of stored) {
    const month = row.key.slice("phones:".length);
    if (!/^\d{4}-\d{2}$/.test(month) || !row.body) continue;
    try {
      const m = JSON.parse(row.body) as PhoneMonth;
      const accounts = { ...(out[month]?.accounts || {}) };
      for (const [k, a] of Object.entries(m.accounts || {})) {
        // A pull that couldn't read the account's own CRISP count keeps the last one that could
        accounts[k] = { ...a, crisp: a.crisp || accounts[k]?.crisp };
      }
      out[month] = { month, accounts };
    } catch { /* keep the starting numbers */ }
  }
  return out;
}
