import Link from "next/link";
import { getPhoneMonths } from "@/lib/data";
import { monthName, fmtDate, today, TZ } from "@/lib/fmt";
import { buildView, rate, shade, GOALS, type TeamRow, type PhoneAgent } from "@/lib/phones";
import { Columns } from "@/components/charts";

export const dynamic = "force-dynamic";

function updatedLabel(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" }).replace(",", "");
  const time = d.toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
  return `${day}, ${time}`;
}
const perDay = (n: number) => (n >= 10 ? Math.round(n).toLocaleString() : (Math.round(n * 10) / 10).toString());

/** One rate: the percent, colored against its goal when there is one, with the counts under it. */
function Stat({ n, d, goal, small }: { n: number; d: number; goal: number | null; small?: boolean }) {
  const pct = rate(n, d);
  if (pct === null) return <div className="phstat"><span className="phpct none">–</span></div>;
  return (
    <div className={`phstat${small ? " sm" : ""}`}>
      <span className={`phpct ${shade(pct, d, goal)}`}>{pct}%</span>
      <span className="phof">{n} of {d}</span>
    </div>
  );
}

/** Outbound volume: calls this month, and calls per selling day once a whole day is in. */
function Calls({ calls, daily, small }: { calls: number; daily: number | null | undefined; small?: boolean }) {
  if (!calls) return <div className="phstat"><span className="phpct none">–</span></div>;
  return (
    <div className={`phstat${small ? " sm" : ""}`}>
      <span className="phpct">{calls.toLocaleString()}</span>
      {daily != null && <span className="phof">{perDay(daily)} a day</span>}
    </div>
  );
}

function People({ row }: { row: TeamRow }) {
  const line = (p: PhoneAgent) => (
    <div className="phrow person" key={p.n}>
      <div className="phteam">{p.n}{row.bdc.has(p.n) && <span className="tag" style={{ marginLeft: 6 }}>BDC</span>}</div>
      <Stat small n={p.ir} d={p.io} goal={null} />
      <Stat small n={p.fi} d={p.ir} goal={null} />
      <Calls small calls={p.oc} daily={row.perDayBy[p.n]} />
      <Stat small n={p.ol} d={p.oc} goal={null} />
      <Stat small n={p.os} d={p.ol} goal={null} />
    </div>
  );
  return (
    <div className="phpeople">
      {row.people.length ? row.people.map(line) : <p className="empty">No calls yet this month</p>}
      <div className="phfoot small">
        {row.bdc.size > 0 && <span className="faint">Outbound on the team line counts the sales floor.</span>}
        <Link href={row.team.href} style={{ marginLeft: "auto" }}>{row.team.name} page</Link>
      </div>
    </div>
  );
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

      <section className="card phones">
        <div className="phrow phgroups" aria-hidden="true">
          <div className="phteam" />
          <div className="phspan two">Inbound sales calls</div>
          <div className="phspan three">Outbound</div>
        </div>
        <div className="phrow phhead">
          <div className="phteam" />
          <div title="Asked for the appointment, out of inbound sales calls">Request <span className="phgoal">goal {GOALS.request}%</span></div>
          <div title="Firm appointments, out of the calls where one was requested">Set <span className="phgoal">goal {GOALS.set}%</span></div>
          <div title="Outbound calls this month, and per selling day">Calls</div>
          <div title="Live conversations, out of outbound calls">Live convo</div>
          <div title="Appointments set, out of live conversations">Appt set</div>
        </div>
        {v.rows.map((r) => (
          <details className="phteamrow" key={r.team.key} style={{ ["--accent" as string]: r.team.color }}>
            <summary className="phrow">
              <div className="phteam"><i className="phdot" />{r.team.name}</div>
              <Stat n={r.ir} d={r.io} goal={GOALS.request} />
              <Stat n={r.fi} d={r.ir} goal={GOALS.set} />
              <Calls calls={r.oc} daily={r.perDay} />
              <Stat n={r.ol} d={r.oc} goal={GOALS.live} />
              <Stat n={r.os} d={r.ol} goal={GOALS.appt} />
            </summary>
            <People row={r} />
          </details>
        ))}
      </section>

      {charts.length > 0 && (
        <section className="card" style={{ marginTop: 16 }}>
          <div className="cardhead">
            <h2>Outbound calls a day, by week</h2>
            <span className="more">Monday to Saturday</span>
          </div>
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
                      label: fmtDate(w.start),
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
                ? `Car Wars shows the account at ${rate(a.crisp.ir, a.crisp.io) ?? "–"}% request (${a.crisp.ir} of ${a.crisp.io}) and ${rate(a.crisp.fi, a.crisp.ir) ?? "–"}% set as of ${updatedLabel(a.crisp.at)}. ${a.crisp.uio} of those ${a.crisp.io} sales calls weren't matched to a person, so they aren't on a line.`
                : `${a.claimed.io} inbound sales calls matched to a person.`}
              {a.teams > 1 && a.other.io > 0 ? ` ${a.other.io} more sit on shared or manager logins.` : ""}
            </p>
          ))}
        </div>
      </details>
    </>
  );
}
