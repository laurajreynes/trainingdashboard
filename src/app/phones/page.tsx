import Link from "next/link";
import { getPhoneMonths } from "@/lib/data";
import { monthName, today, TZ } from "@/lib/fmt";
import { buildView, rate, shade, GOALS, type TeamRow, type PhoneAgent } from "@/lib/phones";

export const dynamic = "force-dynamic";

function updatedLabel(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" }).replace(",", "");
  const time = d.toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
  return `${day}, ${time}`;
}

/** One number: the percent, colored against its goal when there is one, with the counts under it. */
function Stat({ n, d, goal, unit, small }: { n: number; d: number; goal: number | null; unit?: string; small?: boolean }) {
  const pct = rate(n, d);
  if (pct === null) return <div className="phstat"><span className="phpct none">–</span></div>;
  return (
    <div className={`phstat${small ? " sm" : ""}`}>
      <span className={`phpct ${shade(pct, d, goal)}`}>{pct}%</span>
      <span className="phof">{n} of {d}{unit ? ` ${unit}` : ""}</span>
    </div>
  );
}

function People({ row }: { row: TeamRow }) {
  const line = (p: PhoneAgent) => (
    <div className="phrow person" key={p.n}>
      <div className="phteam">{p.n}{row.bdc.has(p.n) && <span className="tag" style={{ marginLeft: 6 }}>BDC</span>}</div>
      <Stat small n={p.ir} d={p.io} goal={null} />
      <Stat small n={p.fi} d={p.ir} goal={null} />
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
  const v = buildView(months[month]);
  const span = v.from === v.to ? `${Number(v.from.slice(8))}` : `${Number(v.from.slice(8))} to ${Number(v.to.slice(8))}`;

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Phones</h1>
          <div className="sub">{monthName(month)} {span}</div>
        </div>
        <div className="headright" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
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
          <div className="phspan">Inbound sales calls</div>
          <div className="phspan">Outbound</div>
        </div>
        <div className="phrow phhead">
          <div className="phteam" />
          <div title="Asked for the appointment, out of inbound sales calls">Request <span className="phgoal">goal {GOALS.request}%</span></div>
          <div title="Firm appointments, out of the calls where one was requested">Set <span className="phgoal">goal {GOALS.set}%</span></div>
          <div title="Live conversations, out of outbound calls">Live convo</div>
          <div title="Appointments set, out of live conversations">Appt set</div>
        </div>
        {v.rows.map((r) => (
          <details className="phteamrow" key={r.team.key} style={{ ["--accent" as string]: r.team.color }}>
            <summary className="phrow">
              <div className="phteam"><i className="phdot" />{r.team.name}</div>
              <Stat n={r.ir} d={r.io} goal={GOALS.request} />
              <Stat n={r.fi} d={r.ir} goal={GOALS.set} />
              <Stat n={r.ol} d={r.oc} goal={GOALS.live} />
              <Stat n={r.os} d={r.ol} goal={GOALS.appt} />
            </summary>
            <People row={r} />
          </details>
        ))}
      </section>

      <details className="quiet phsum">
        <summary className="small">How this adds up</summary>
        <div className="small muted" style={{ marginTop: 8, display: "grid", gap: 6 }}>
          {v.accounts.map((a) => {
            const shared = v.rows.filter((r) => r.team.account === a.key).length > 1;
            return (
              <p key={a.key}>
                <strong>{a.name}</strong> in Car Wars: {rate(a.total.ir, a.total.io) ?? "–"}% request ({a.total.ir} of {a.total.io}), {rate(a.total.fi, a.total.ir) ?? "–"}% set ({a.total.fi} of {a.total.ir}).
                {shared
                  ? ` One account covers five teams, so each team line adds up its own people. ${a.unclaimed.io} of the ${a.total.io} sales calls aren't matched to a person yet and sit outside the team lines${a.other.io ? `, along with ${a.other.io} on shared or manager logins` : ""}.`
                  : " Its own account, so the inbound numbers are the account's."}
              </p>
            );
          })}
        </div>
      </details>
    </>
  );
}
