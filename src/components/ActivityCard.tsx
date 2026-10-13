import Link from "next/link";
import { fmtDate } from "@/lib/fmt";
import type { Initiative, Person } from "@/lib/types";
import { shortInitName } from "@/lib/types";

export type ActivityRow = { name: string; opps: number; calls: number; texts: number; contacted?: number; apptCreated: number; shown: number; sold: number; showroom?: number; phone?: number; internet?: number };
export type Activity = { from: string; to: string; source?: string; rows: ActivityRow[] };

const tpc = (r: ActivityRow) => (r.calls ? r.texts / r.calls : r.texts ? 99 : 0);

/** Calls versus texts from the DriveCentric activity report: who is picking up the phone and who is hiding behind texts. */
export function ActivityCard({ data, people, initiative, title = "Calls vs texts", color }: {
  data: Activity; people: Person[]; initiative?: Initiative | null; title?: string; color: string;
}) {
  const rows = data.rows.filter((r) => r.calls + r.texts >= 40);   // enough activity to say anything
  if (!rows.length) return null;
  const calls = data.rows.reduce((a, r) => a + r.calls, 0), texts = data.rows.reduce((a, r) => a + r.texts, 0);
  const ratio = calls ? texts / calls : 0;
  const best = [...rows].filter((r) => r.calls >= 30).sort((a, b) => tpc(a) - tpc(b)).slice(0, 3);
  const worst = [...rows].filter((r) => r.texts >= 60 && !best.includes(r)).sort((a, b) => tpc(b) - tpc(a)).slice(0, 3);
  const person = (n: string) => people.find((p) => p.name.toLowerCase() === n.toLowerCase() || p.name.toLowerCase().split(" ")[0] === n.toLowerCase().split(" ")[0] && p.name.toLowerCase().endsWith(n.toLowerCase().split(" ").pop() || ""));
  const max = Math.max(1, ...rows.map((r) => Math.max(r.calls, r.texts)));
  const Row = ({ r }: { r: ActivityRow }) => {
    const p = person(r.name);
    return (
      <li className="actrow">
        <div className="actname">{p ? <Link href={`/p/${p.id}`}>{r.name}</Link> : r.name}<span className="faint small"> · {r.sold} sold</span></div>
        <div className="actbars">
          <div className="actbar"><i style={{ width: `${(r.calls / max) * 100}%`, background: color }} /><b>{r.calls} calls</b></div>
          <div className="actbar"><i style={{ width: `${(r.texts / max) * 100}%`, background: "var(--line-strong)" }} /><b>{r.texts} texts</b></div>
        </div>
        <div className="actratio"><strong>{tpc(r) >= 99 ? "∞" : tpc(r).toFixed(1)}</strong><span className="faint small"> texts per call</span></div>
      </li>
    );
  };
  return (
    <section className="card activity" style={{ ["--accent" as string]: color }}>
      <div className="cardhead">
        <h2>{title}</h2>
        <span className="faint small">{fmtDate(data.from)} to {fmtDate(data.to)}</span>
      </div>
      <div className="actsummary">
        <strong className="bignum">{ratio.toFixed(1)}</strong>
        <span className="small muted">texts for every call across the team · {calls.toLocaleString()} calls, {texts.toLocaleString()} texts</span>
        {initiative && <Link href={`/i/${initiative.id}`} className="tag area" style={{ marginLeft: "auto" }}>{shortInitName(initiative.name)}</Link>}
      </div>
      {best.length > 0 && <>
        <div className="eyebrow" style={{ color: "var(--good)", marginTop: 8 }}>Picking up the phone</div>
        <ul className="actlist">{best.map((r) => <Row key={r.name} r={r} />)}</ul>
      </>}
      {worst.length > 0 && <>
        <div className="eyebrow" style={{ color: "var(--warn)", marginTop: 10 }}>Leaning on texts</div>
        <ul className="actlist">{worst.map((r) => <Row key={r.name} r={r} />)}</ul>
      </>}
      <details className="quiet" style={{ marginTop: 8 }}>
        <summary className="small">Everyone ({data.rows.length})</summary>
        <table className="tbl small" style={{ marginTop: 6 }}>
          <thead><tr><th>Name</th><th>Opps</th><th>Calls</th><th>Texts</th><th>T/C</th><th>Appts</th><th>Shown</th><th>Sold</th></tr></thead>
          <tbody>{[...data.rows].sort((a, b) => b.opps - a.opps).map((r) => <tr key={r.name}><td>{r.name}</td><td>{r.opps}</td><td>{r.calls}</td><td>{r.texts}</td><td>{r.calls ? tpc(r).toFixed(1) : "–"}</td><td>{r.apptCreated}</td><td>{r.shown}</td><td>{r.sold}</td></tr>)}</tbody>
        </table>
      </details>
    </section>
  );
}
