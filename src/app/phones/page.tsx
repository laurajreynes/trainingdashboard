import Link from "next/link";
import { getPhoneMonths } from "@/lib/data";
import { monthName, fmtDate, today, TZ } from "@/lib/fmt";
import { buildView, rate } from "@/lib/phones";
import PhonesTable from "@/components/PhonesTable";
import { Columns } from "@/components/charts";

export const dynamic = "force-dynamic";

function updatedLabel(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" }).replace(",", "");
  const time = d.toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
  return `${day}, ${time}`;
}
export default async function PhonesPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const sp = await searchParams;
  const months = await getPhoneMonths();
  const have = Object.keys(months).sort();
  const cur = today().slice(0, 7);
  const month = sp.month && months[sp.month] ? sp.month : months[cur] ? cur : have[have.length - 1];
  if (!month) return <p className="empty">No phone numbers yet.</p>;
  const v = buildView(months, month);
  const span = v.from === v.to ? `${Number(v.from.slice(8))}` : `${Number(v.from.slice(8))} to ${Number(v.to.slice(8))}`;
  const charts = v.trend.filter((t) => t.weeks.some((w) => w.avg !== null));

  return (
    <>
      <div className="pagehead phhd">
        <div className="phdates">{monthName(month)} {span}</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {have.length > 1 && (
            <nav className="sidetoggle" aria-label="Month">
              {have.slice(-2).map((m) => <Link key={m} href={`/phones?month=${m}`} className={m === month ? "on" : ""} aria-current={m === month ? "page" : undefined}>{monthName(m)}</Link>)}
            </nav>
          )}
          {v.pulled && <span className="tag gold" id="last-updated">Updated <strong>{updatedLabel(v.pulled)}</strong></span>}
        </div>
      </div>

      <PhonesTable
        rows={v.rows.map((r) => ({
          team: { key: r.team.key, name: r.team.name, href: r.team.href, color: r.team.color },
          io: r.io, ir: r.ir, fi: r.fi, oc: r.oc, ol: r.ol, os: r.os,
          perDay: r.perDay, perDayBy: r.perDayBy,
          people: r.people.map(({ n, io, ir, fi, oc, ol, os }) => ({ n, io, ir, fi, oc, ol, os })),
          bdc: [...r.bdc],
        }))}
      />

      {charts.length > 0 && (
        <section className="card" style={{ marginTop: 16 }}>
          <div className="cardhead">
            <h2>Outbound calls a day, by week</h2>
          </div>
          <p className="small muted" style={{ margin: "-4px 0 14px" }}>From Car Wars. Each bar is one week: the team&rsquo;s outbound calls added up, divided by the days it was open (Monday to Saturday). Starts with each store&rsquo;s first full week live on Car Wars.</p>
          <div className="phtrend">
            {charts.map(({ team, weeks }) => {
              const shown = weeks.filter((w) => w.avg !== null);
              const lastTwo = shown.slice(-2);
              const delta = lastTwo.length === 2 && !lastTwo[1].partial ? Math.round(lastTwo[1].avg! - lastTwo[0].avg!) : null;
              return (
                <div className="phchart" key={team.key}>
                  <div className="phchart-head">
                    <span className="phteam"><i className="phdot" style={{ background: team.color }} />{team.name}</span>
                    {delta !== null && delta !== 0 && <span className="small faint">{delta > 0 ? "+" : "−"}{Math.abs(delta)} a day vs the week before</span>}
                  </div>
                  <Columns
                    height={96}
                    points={weeks.map((w) => ({
                      label: w.partial ? `${fmtDate(w.start)} so far` : fmtDate(w.start),
                      value: w.avg === null ? 0 : w.avg >= 10 ? Math.round(w.avg) : Math.round(w.avg * 10) / 10,
                      hint: w.avg === null ? `Week of ${fmtDate(w.start)}: nothing yet` : `Week of ${fmtDate(w.start)}: ${w.total.toLocaleString()} calls over ${w.days} day${w.days === 1 ? "" : "s"}${w.partial ? ", week in progress" : ""}`,
                    }))}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      <details className="quiet phsum">
        <summary className="small">How this adds up</summary>
        <div className="small muted" style={{ marginTop: 8, display: "grid", gap: 6 }}>
          <p>Every line adds up its own people from Car Wars Staff Activity. Calls a day counts whole selling days.</p>
          {v.accounts.map((a) => (
            <p key={a.key}>
              <strong>{a.name}</strong>{a.teams > 1 ? ` (one Car Wars account for ${a.teams} teams)` : ""}:{" "}
              {a.crisp
                ? `Car Wars shows the account at ${rate(a.crisp.ir, a.crisp.io) ?? "–"}% request (${a.crisp.ir} of ${a.crisp.io}) and ${rate(a.crisp.fi, a.crisp.ir) ?? "–"}% set as of ${updatedLabel(a.crisp.at)}. ${a.crisp.uio} of those ${a.crisp.io} sales calls ${a.crisp.uio === 1 ? "wasn't" : "weren't"} matched to a person, so ${a.crisp.uio === 1 ? "it isn't" : "they aren't"} on a line.`
                : `${a.claimed.io} inbound sales calls matched to a person.`}
              {a.teams > 1 && a.other.io > 0 ? ` ${a.other.io} more sit on shared or manager logins.` : ""}
            </p>
          ))}
        </div>
      </details>
    </>
  );
}
