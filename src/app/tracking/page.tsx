import Link from "next/link";
import { isEditor } from "@/lib/auth";
import { getStores, getMetrics } from "@/lib/data";
import { monthName, storeAccent, fmtDate, today, monthsBack } from "@/lib/fmt";
import { monthPhase } from "@/lib/month";
import { getTargets, sellingDays, track, trackClass, targetKey } from "@/lib/tracking";
import { saveTargets, setStoreSoldSplit } from "@/app/actions";
import { Meter } from "@/components/charts";

export const dynamic = "force-dynamic";

type Row = { key: string; name: string; storeId: string; location: string | null; slug: string; color: string };

/** The weekend report, live: month to date, where it's tracking, and the target, by store, new and used. */
export default async function TrackingPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const sp = await searchParams;
  const mi = monthPhase();
  const month = /^\d{4}-\d{2}$/.test(sp.month || "") ? sp.month! : mi.month;
  const [editor, stores] = await Promise.all([isEditor(), getStores()]);
  const prevMonth = monthsBack(2)[0] === month ? monthsBack(3)[0] : mi.prevMonth;
  const lastYear = `${Number(month.slice(0, 4)) - 1}${month.slice(4)}`;
  const [targets, metrics] = await Promise.all([getTargets(month), getMetrics({ periods: [month, prevMonth, lastYear] })]);
  const days = sellingDays(month);
  const isCurrent = month === mi.month;

  const rows: Row[] = [];
  for (const s of stores.filter((x) => !x.is_bdc).sort((a, b) => a.sort_order - b.sort_order)) {
    rows.push({ key: targetKey(s.id, null), name: s.short_name, storeId: s.id, location: null, slug: s.slug, color: storeAccent(s) });
    for (const l of s.locations) rows.push({ key: targetKey(s.id, l), name: l, storeId: s.id, location: l, slug: `${s.slug}/at/${l.toLowerCase()}`, color: storeAccent(s) });
  }
  const metric = (r: Row, period: string) => metrics.find((m) => m.store_id === r.storeId && (m.location || null) === r.location && m.period === period);
  const asOfAll = metrics.filter((m) => m.period === month).map((m) => m.as_of).sort().pop();
  const done = isCurrent ? (asOfAll ? days.dates.filter((d) => d <= asOfAll).length : days.done) : days.total;

  const cell = (mtd: number | null, target: number | null) => {
    const tr = mtd === null ? null : track(mtd, done, days.total);
    const pct = tr !== null && target ? Math.round((tr / target) * 100) : null;
    return { mtd, tr, target, pct };
  };
  const totals = { mtd: 0, tr: 0, target: 0, prev: 0 };

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Tracking</div>
          <h1>{monthName(month)} {month.slice(0, 4)}</h1>
        </div>
        <div className="daysbox">
          <div><div className="v">{days.total}</div><div className="l">selling days</div></div>
          <div><div className="v">{done}</div><div className="l">completed</div></div>
          <div><div className="v">{Math.max(0, days.total - done)}</div><div className="l">remaining</div></div>
        </div>
      </div>
      <div className="small faint" style={{ marginBottom: 12 }}>
        {[monthsBack(3)[1], mi.month].filter((m, i, a) => a.indexOf(m) === i).map((m) => <Link key={m} href={`/tracking?month=${m}`} style={{ marginRight: 12, fontWeight: m === month ? 700 : 400 }}>{monthName(m)}</Link>)}
      </div>

      <div className="trackgrid">
        {rows.map((r) => {
          const m = metric(r, month);
          const pm = metric(r, prevMonth);
          const saved = targets[r.key] || { new: null, used: null };
          const hasMap = saved.mapNew != null || saved.mapUsed != null;
          const mapOf = (label: string) => label === "New" ? saved.mapNew ?? null : label === "Used" ? saved.mapUsed ?? null : (saved.mapNew || 0) + (saved.mapUsed || 0);
          const ly = metric(r, lastYear);
          const hasTarget = saved.new !== null || saved.used !== null;
          // No target yet: track against the same month last year, and say so
          const t = hasTarget ? saved : ly ? { new: ly.new_sold ?? null, used: ly.used_sold ?? null } : saved;
          const vsLastYear = !hasTarget && Boolean(ly);
          const nw = cell(m ? m.new_sold ?? (m.used_sold == null ? null : m.sold - (m.used_sold || 0)) : null, t.new);
          const us = cell(m ? m.used_sold ?? (m.new_sold == null ? null : m.sold - (m.new_sold || 0)) : null, t.used);
          const tot = cell(m ? m.sold : null, hasTarget ? (t.new || 0) + (t.used || 0) : ly ? ly.sold : null);
          totals.mtd += tot.mtd || 0; totals.tr += tot.tr || 0; totals.target += tot.target || 0; totals.prev += pm?.sold || 0;
          // A used-only lot (Belgrade) gets one line, no New row and no Total
          const usedOnly = Boolean(r.location) && !(m?.new_sold || pm?.new_sold || ly?.new_sold || saved.new);
          const lines = (usedOnly ? [["Used", us, pm?.used_sold ?? null]] : [["New", nw, pm?.new_sold ?? null], ["Used", us, pm?.used_sold ?? null], ["Total", tot, pm?.sold ?? null]]) as readonly (readonly [string, ReturnType<typeof cell>, number | null])[];
          return (
            <section className="card trackcard" key={r.key} style={{ ["--accent" as string]: r.color }}>
              <div className="cardhead">
                <h2><Link href={`/s/${r.slug}`} style={{ color: r.color }}>{r.name}</Link></h2>
                <span className={`tag ${trackClass(tot.pct)}`}>{tot.pct !== null ? `${tot.pct}% of ${vsLastYear ? "last year" : "target"}` : tot.target ? "no numbers yet" : "no target"}</span>
              </div>
              <table className="tbl track">
                <thead><tr><th></th><th>MTD</th><th>Tracking</th>{hasMap && <th title="Minimum acceptable performance">MAP</th>}<th>{vsLastYear ? <span className="faint">Last yr</span> : "Target"}</th><th>Track</th><th className="faint">{monthName(prevMonth).slice(0, 3)}</th></tr></thead>
                <tbody>
                  {lines.map(([label, c, prev]) => (
                    <tr key={label} className={label === "Total" ? "total" : ""}>
                      <td>{label}</td>
                      <td><strong>{c.mtd ?? "–"}</strong></td>
                      <td>{c.tr ?? "–"}</td>
                      {hasMap && <td className="faint">{mapOf(label) || "–"}</td>}
                      <td>{c.target ?? "–"}</td>
                      <td>{c.pct !== null ? <span className={`tag ${trackClass(c.pct)}`}>{c.pct}%</span> : ""}</td>
                      <td className="faint">{prev ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tot.target ? <Meter value={tot.mtd || 0} target={tot.target} floor={hasMap ? (saved.mapNew || 0) + (saved.mapUsed || 0) : null} color={r.color} /> : null}
              {editor && (
                <details className="quiet" style={{ marginTop: 8 }}>
                  <summary>Update month to date</summary>
                  <form action={setStoreSoldSplit} className="inline" style={{ marginTop: 6 }}>
                    <input type="hidden" name="store_id" value={r.storeId} />
                    <input type="hidden" name="location" value={r.location || ""} />
                    <input type="hidden" name="period" value={month} />
                    {usedOnly ? <input type="hidden" name="new_sold" value="0" /> : <input type="number" name="new_sold" placeholder="New" defaultValue={m?.new_sold ?? ""} style={{ width: 70 }} />}
                    <input type="number" name="used_sold" placeholder="Used" defaultValue={m?.used_sold ?? ""} style={{ width: 70 }} />
                    <input type="date" name="as_of" defaultValue={m?.as_of || today()} style={{ width: 140 }} />
                    <button className="btn sm">Save</button>
                  </form>
                </details>
              )}
            </section>
          );
        })}
      </div>


      {editor && (
        <details className="card quiet" style={{ marginTop: 18 }}>
          <summary>Targets for {monthName(month)}</summary>
          <form action={saveTargets} style={{ marginTop: 10 }}>
            <input type="hidden" name="month" value={month} />
            <table className="tbl">
              <thead><tr><th>Store</th><th>New</th><th>Used</th><th className="faint" title="Minimum acceptable performance">MAP new</th><th className="faint">MAP used</th><th className="faint">{monthName(prevMonth)} actual</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const t = targets[r.key] || { new: null, used: null };
                  const pm = metric(r, prevMonth);
                  return (
                    <tr key={r.key}>
                      <td style={{ fontWeight: 600, color: r.color }}>{r.name}</td>
                      <td><input type="number" name={`t.${r.key}.new`} defaultValue={t.new ?? ""} style={{ width: 90 }} /></td>
                      <td><input type="number" name={`t.${r.key}.used`} defaultValue={t.used ?? ""} style={{ width: 90 }} /></td>
                      <td><input type="number" name={`t.${r.key}.mapNew`} defaultValue={t.mapNew ?? ""} style={{ width: 80 }} /></td>
                      <td><input type="number" name={`t.${r.key}.mapUsed`} defaultValue={t.mapUsed ?? ""} style={{ width: 80 }} /></td>
                      <td className="faint small">{pm ? `${pm.new_sold ?? "?"} new · ${pm.used_sold ?? "?"} used` : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button className="btn" style={{ marginTop: 10 }}>Save targets</button>
          </form>
        </details>
      )}
    </>
  );
}
