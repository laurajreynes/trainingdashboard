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
