import { PHONES_SEED } from "./phones-seed";

/**
 * Phones tab: inbound and outbound phone performance by team, from Car Wars.
 *
 * Car Wars has two accounts. Gallatin Subaru is its own account, so its inbound numbers are the account's CRISP numbers
 * as published. Chevrolet, Toyota, Belgrade, Danhof and the Ressler BDC all share one account, and CRISP has no team
 * filter (asking its feed for one group returns that group plus every unclaimed call in the account). So those rows are
 * built here: each person's CRISP counts, added up by the Car Wars group they are in. Calls nobody has claimed stay out
 * of the team rows and show under "How this adds up".
 */

export type PhoneCounts = { io: number; ir: number; fi: number; oc: number; ol: number; os: number };
export type PhoneAgent = PhoneCounts & { n: string; g: string[] };
export type PhoneAccount = { from: string; to: string; pulled: string; total: PhoneCounts; agents: PhoneAgent[] };
export type PhoneMonth = { month: string; accounts: Record<string, PhoneAccount> };

/** Benchmarks. Inbound carries over from the Ring Ring dashboard. Outbound has none yet, so those cells stay uncolored. */
export const GOALS: { request: number; set: number; live: number | null; appt: number | null } = { request: 80, set: 45, live: null, appt: null };
/** Under this many calls a percentage is shown without a color: one call swings it too far. */
export const THIN = 5;

export type TeamDef = { key: string; name: string; account: string; group?: string; href: string; color: string };
export const TEAMS: TeamDef[] = [
  { key: "bdc", name: "Ressler BDC", account: "cct", group: "BDC (default)", href: "/s/sales-bdc", color: "var(--store-sales-bdc)" },
  { key: "toyota", name: "Toyota", account: "cct", group: "Toyota", href: "/s/toyota", color: "var(--store-toyota)" },
  { key: "chevrolet", name: "Chevrolet", account: "cct", group: "Chevrolet", href: "/s/chevrolet", color: "var(--store-chevrolet)" },
  { key: "belgrade", name: "Belgrade", account: "cct", group: "Belgrade", href: "/s/chevrolet/at/belgrade", color: "var(--store-chevrolet)" },
  { key: "danhof", name: "Danhof", account: "cct", group: "Danhof", href: "/s/chevrolet/at/danhof", color: "var(--store-chevrolet)" },
  { key: "subaru", name: "Gallatin Subaru", account: "subaru", href: "/s/subaru", color: "var(--store-subaru)" },
];
export const ACCOUNT_NAME: Record<string, string> = { cct: "Chevrolet Cadillac Toyota", subaru: "Gallatin Subaru" };

/** Car Wars groups that hold managers. Someone also in a store's own group (Belgrade, Toyota...) counts with that store. */
const MANAGER_GROUPS = ["New Car Sales (default)", "Used Car Sales (default)", "Sales Manager (default)"];
/** Never a salesperson row: the trainer, the AI agent's login, managers who aren't in a manager group. */
const NOT_STAFF = [/^laura reynes$/i, /^genius user/i, /^russ stump$/i, /^sean skelton$/i, /^troy mossing$/i];
/** BDC people Car Wars doesn't have in a BDC group yet. They stay on inbound and come out of the floor's outbound. */
const ALSO_BDC = [/^halie monroe$/i];

const isUnclaimed = (a: PhoneAgent) => a.n === "Unclaimed";
const notStaff = (a: PhoneAgent) => NOT_STAFF.some((r) => r.test(a.n)) || a.g.some((g) => /service/i.test(g));
const isManager = (a: PhoneAgent) => a.g.some((g) => MANAGER_GROUPS.includes(g));
export const isBdc = (a: PhoneAgent) => a.g.includes("BDC (default)") || ALSO_BDC.some((r) => r.test(a.n));

const ZERO: PhoneCounts = { io: 0, ir: 0, fi: 0, oc: 0, ol: 0, os: 0 };
const add = (a: PhoneCounts, b: PhoneCounts): PhoneCounts => ({ io: a.io + b.io, ir: a.ir + b.ir, fi: a.fi + b.fi, oc: a.oc + b.oc, ol: a.ol + b.ol, os: a.os + b.os });
const sum = (list: PhoneCounts[]) => list.reduce(add, ZERO);

export type TeamRow = {
  team: TeamDef;
  /** Inbound sales calls, appointment requests, firm appointments. */
  io: number; ir: number; fi: number;
  /** Outbound calls, live conversations, appointments set. */
  oc: number; ol: number; os: number;
  people: PhoneAgent[];
  /** Subaru only: people whose outbound is left out of the row (the BDC). */
  bdc: Set<string>;
};
export type PhoneView = {
  month: string; from: string; to: string; pulled: string;
  rows: TeamRow[];
  /** One line per Car Wars account, to tie the team rows back to what Car Wars shows. */
  accounts: { key: string; name: string; total: PhoneCounts; unclaimed: PhoneCounts; other: PhoneCounts; otherNames: string[] }[];
};

/** Which team a person in the shared account counts with: their store's group first, the BDC otherwise. */
export function teamOf(a: PhoneAgent): string | null {
  if (isUnclaimed(a) || notStaff(a)) return null;
  const store = TEAMS.find((t) => t.group && t.key !== "bdc" && a.g.includes(t.group));
  if (store) return store.key;
  if (a.g.includes("BDC (default)")) return "bdc";
  return null;
}

export function buildView(m: PhoneMonth): PhoneView {
  const rows: TeamRow[] = [];
  const accounts: PhoneView["accounts"] = [];
  const byPeople = (a: PhoneAgent, b: PhoneAgent) => b.io - a.io || b.ir - a.ir || b.oc - a.oc || a.n.localeCompare(b.n);

  for (const [key, acct] of Object.entries(m.accounts)) {
    const unclaimed = sum(acct.agents.filter(isUnclaimed));
    const teams = TEAMS.filter((t) => t.account === key);
    const counted = new Set<string>();
    for (const t of teams) {
      if (t.group) {
        const people = acct.agents.filter((a) => teamOf(a) === t.key).sort(byPeople);
        people.forEach((p) => counted.add(p.n));
        rows.push({ team: t, ...sum(people), people, bdc: new Set() });
      } else {
        // A whole account: inbound is the account's published CRISP count, outbound is the sales floor only
        const people = acct.agents.filter((a) => !isUnclaimed(a) && !notStaff(a) && !isManager(a)).sort(byPeople);
        people.forEach((p) => counted.add(p.n));
        const floor = sum(people.filter((p) => !isBdc(p)));
        rows.push({ team: t, io: acct.total.io, ir: acct.total.ir, fi: acct.total.fi, oc: floor.oc, ol: floor.ol, os: floor.os, people, bdc: new Set(people.filter(isBdc).map((p) => p.n)) });
      }
    }
    const others = acct.agents.filter((a) => !isUnclaimed(a) && !counted.has(a.n));
    accounts.push({ key, name: ACCOUNT_NAME[key] || key, total: acct.total, unclaimed, other: sum(others), otherNames: others.filter((a) => a.io || a.oc).map((a) => a.n) });
  }
  rows.sort((a, b) => TEAMS.indexOf(a.team) - TEAMS.indexOf(b.team));
  const all = Object.values(m.accounts);
  return {
    month: m.month,
    from: all.map((a) => a.from).sort()[0] || `${m.month}-01`,
    to: all.map((a) => a.to).sort().pop() || `${m.month}-01`,
    pulled: all.map((a) => a.pulled).sort().pop() || "",
    rows, accounts,
  };
}

export const rate = (n: number, d: number): number | null => (d ? Math.round((n / d) * 100) : null);

/** Green at the goal, yellow within three quarters of it, red under that. No color without a goal or with too few calls. */
export function shade(pct: number | null, calls: number, goal: number | null): "" | "good" | "warn" | "bad" {
  if (pct === null || goal === null || calls < THIN) return "";
  return pct >= goal ? "good" : pct >= goal * 0.75 ? "warn" : "bad";
}

// ---------- reading the stored months ----------

function parseSeed(text: string): Record<string, PhoneMonth> {
  const out: Record<string, PhoneMonth> = {};
  for (const block of text.trim().split(/\n\s*\n/)) {
    const [head, ...lines] = block.trim().split("\n");
    const [left, right] = head.split("|").map((s) => s.trim());
    const [month, account, from, to, pulled] = left.split(/\s+/);
    const t = right.split(",").map(Number);
    const agents = lines.map((l) => {
      const p = l.split("|");
      return { n: p[0], g: p[1] ? p[1].split("+") : [], io: +p[2], ir: +p[3], fi: +p[4], oc: +p[5], ol: +p[6], os: +p[7] };
    });
    out[month] = out[month] || { month, accounts: {} };
    out[month].accounts[account] = { from, to, pulled, total: { io: t[0], ir: t[1], fi: t[2], oc: t[3], ol: t[4], os: t[5] }, agents };
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
/** Checks a posted account pull and returns it in the stored shape, or says what is wrong with it. */
export function cleanAccount(v: unknown): PhoneAccount | string {
  const o = (v || {}) as Record<string, unknown>;
  const total = cleanCounts(o.total);
  if (!total) return "total needs io, ir, fi, oc, ol, os";
  if (!Array.isArray(o.agents) || !o.agents.length) return "agents[] required";
  const agents: PhoneAgent[] = [];
  for (const a of o.agents as Record<string, unknown>[]) {
    const c = cleanCounts(a);
    if (!c || typeof a.n !== "string" || !a.n.trim()) return `bad agent row: ${JSON.stringify(a).slice(0, 80)}`;
    agents.push({ n: a.n.trim().slice(0, 80), g: Array.isArray(a.g) ? (a.g as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 8) : [], ...c });
  }
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (typeof o.from !== "string" || typeof o.to !== "string" || !iso.test(o.from) || !iso.test(o.to)) return "from and to must be YYYY-MM-DD";
  // The people rows have to add back up to the account: a pull that doesn't is a bad pull, not a new number
  const s = sum(agents);
  if (s.io !== total.io || s.ir !== total.ir || s.oc !== total.oc) return `agent rows don't add up to the total (${s.io}/${s.ir}/${s.oc} vs ${total.io}/${total.ir}/${total.oc})`;
  return { from: o.from, to: o.to, pulled: typeof o.pulled === "string" && !Number.isNaN(Date.parse(o.pulled)) ? o.pulled : new Date().toISOString(), total, agents };
}

/** Stored pulls laid over the starting numbers, month by month and account by account. */
export function mergeMonths(stored: { key: string; body: string | null }[]): Record<string, PhoneMonth> {
  const out = seedMonths();
  for (const row of stored) {
    const month = row.key.slice("phones:".length);
    if (!/^\d{4}-\d{2}$/.test(month) || !row.body) continue;
    try {
      const m = JSON.parse(row.body) as PhoneMonth;
      out[month] = { month, accounts: { ...(out[month]?.accounts || {}), ...(m.accounts || {}) } };
    } catch { /* keep the starting numbers */ }
  }
  return out;
}
