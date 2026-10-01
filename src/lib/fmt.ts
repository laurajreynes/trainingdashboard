// All "what day is it" logic runs in Bozeman time, not the server's UTC clock.
export const TZ = "America/Denver";

/** Today's date in Bozeman as YYYY-MM-DD. */
export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function parse(d: string): [number, number, number] {
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  return [y, m, day];
}

function dayNumber(d: string): number {
  const [y, m, day] = parse(d);
  return Math.round(Date.UTC(y, m - 1, day) / 86400000);
}

export function fmtDate(d: string | null | undefined, opts: { weekday?: boolean } = {}): string {
  if (!d) return "";
  const [y, m, day] = parse(d);
  const dt = new Date(Date.UTC(y, m - 1, day, 12));
  return dt.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short", day: "numeric",
    ...(opts.weekday ? { weekday: "short" } : {}),
    ...(y !== parse(today())[0] ? { year: "numeric" } : {}),
  });
}

export function daysFromToday(d: string): number {
  return dayNumber(d) - dayNumber(today());
}

export function relDay(d: string | null): string {
  if (!d) return "";
  const n = daysFromToday(d);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  if (n < 0) return `${-n}d ago`;
  return `in ${n}d`;
}

export function addDays(d: string, n: number): string {
  const [y, m, day] = parse(d);
  return new Date(Date.UTC(y, m - 1, day + n)).toISOString().slice(0, 10);
}

export function pct(n: number, d: number): number {
  return d ? Math.round((n / d) * 100) : 0;
}

export function monthName(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("en-US", { timeZone: "UTC", month: "long" });
}

/** The last n calendar months as YYYY-MM, oldest first, ending with the current month. */
/** Start dates (Monday) of the last n weeks, oldest first, ending with the current week. */
export function weeksBack(n: number): string[] {
  const t = today();
  const [y, m, d] = t.split("-").map(Number);
  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // Monday = 0
  const monday = addDays(t, -dow);
  return Array.from({ length: n }, (_, k) => addDays(monday, -7 * (n - 1 - k)));
}

export function monthsBack(n: number): string[] {
  const [y, m] = today().split("-").map(Number);
  return Array.from({ length: n }, (_, k) => {
    const d = new Date(Date.UTC(y, m - 1 - (n - 1 - k), 1));
    return d.toISOString().slice(0, 7);
  });
}

/** Store color: a validated CSS token by slug, with the database value as a fallback. */
export function storeAccent(store: { slug: string; accent: string } | null | undefined): string {
  if (!store) return "var(--brand)";
  return `var(--store-${store.slug}, ${store.accent})`;
}

/** Top-nav order: each shared BDC sits right after the last store it serves. */
export function navOrder<T extends { slug: string; is_bdc: boolean; shows_under: string[]; sort_order: number }>(stores: T[]): T[] {
  const primary = stores.filter((s) => !s.is_bdc).sort((a, b) => a.sort_order - b.sort_order);
  const bdcs = stores.filter((s) => s.is_bdc);
  const out: T[] = [];
  for (const s of primary) {
    out.push(s);
    for (const b of bdcs) {
      const last = b.shows_under[b.shows_under.length - 1];
      if (last === s.slug && !out.includes(b)) out.push(b);
    }
  }
  for (const b of bdcs) if (!out.includes(b)) out.push(b);
  return out;
}

/** The Nth weekday of a month, as YYYY-MM-DD. weekday: 0 = Sunday … 4 = Thursday. */
export function nthWeekday(ym: string, n: number, weekday: number): string {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const day = 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
  return `${ym}-${String(day).padStart(2, "0")}`;
}

/** Next second-Thursday GM meeting on or after today. */
export function nextGmMeeting(): string {
  const t = today();
  const thisMonth = nthWeekday(t.slice(0, 7), 2, 4);
  if (thisMonth >= t) return thisMonth;
  const [y, m] = t.split("-").map(Number);
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
  return nthWeekday(next, 2, 4);
}

/** Days in a YYYY-MM month. */
export function daysInMonth(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Project a month-to-date count to month end from the as-of date. */
export function projectToMonthEnd(value: number, asOf: string): number {
  const day = Number(asOf.slice(8, 10));
  const dim = daysInMonth(asOf.slice(0, 7));
  return day ? Math.round((value / day) * dim) : value;
}
