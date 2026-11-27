import { redirect } from "next/navigation";
import { isEditor } from "@/lib/auth";
import { today } from "@/lib/fmt";
import { getHits, type DayHits } from "@/lib/hits";

export const dynamic = "force-dynamic";

const SITES: Record<string, string> = { hub: "Training hub", chevy: "Chevy board", toyota: "Toyota board", subaru: "Subaru board" };

function daysBack(n: number): string[] {
  const [y, m, d] = today().split("-").map(Number);
  return Array.from({ length: n }, (_, i) => new Date(Date.UTC(y, m - 1, d - i)).toISOString().slice(0, 10));
}

export default async function Usage() {
  if (!(await isEditor())) redirect("/login?next=/usage");
  const days = daysBack(14);
  const all: DayHits[] = await Promise.all(days.map((d) => getHits(d)));
  type Row = { site: string; path: string; team: number; people: Set<string>; me: number; teamDays: Set<string>; clicks: Record<string, number> };
  const rows = new Map<string, Row>();
  all.forEach((day, i) => {
    for (const [k, v] of Object.entries(day)) {
      const sp = k.indexOf(" "), site = k.slice(0, sp), path = k.slice(sp + 1);
      const r = rows.get(k) || { site, path, team: 0, people: new Set<string>(), me: 0, teamDays: new Set<string>(), clicks: {} };
      r.team += v.team?.v || 0; r.me += v.me?.v || 0;
      (v.team?.u || []).forEach((u) => r.people.add(u));
      if ((v.team?.v || 0) > 0) r.teamDays.add(days[i]);
      for (const [l, n] of Object.entries(v.team?.c || {})) r.clicks[l] = (r.clicks[l] || 0) + n;
      rows.set(k, r);
    }
  });
  const list = [...rows.values()].sort((a, b) => b.team - a.team || b.me - a.me);
  const sites = [...new Set(list.map((r) => r.site))];
  const started = list.length > 0;

  return (
    <>
      <div className="pagehead"><div><div className="eyebrow">Last 14 days</div><h1>Who opens what</h1>
        <div className="sub small">Team is everyone who is not signed in as you. Counting started Nov 27, 2026.</div></div></div>
      <div className="stack">
        {!started && <div className="card">Nothing counted yet. Opens and taps show up here as they happen.</div>}
        {sites.map((s) => {
          const rs = list.filter((r) => r.site === s);
          return (
            <section key={s} className="card">
              <div className="cardhead"><h2>{SITES[s] || s}</h2><span className="faint small">{rs.reduce((n, r) => n + r.team, 0)} team opens</span></div>
              <table className="tbl small">
                <thead><tr><th>Page</th><th className="num">Team opens</th><th className="num">Devices</th><th className="num">Days</th><th className="num">You</th><th>Most tapped by the team</th></tr></thead>
                <tbody>
                  {rs.map((r) => {
                    const top = Object.entries(r.clicks).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([l, n]) => `${l} (${n})`).join(", ");
                    return (
                      <tr key={r.path}><td>{r.path}</td><td className="num">{r.team}</td><td className="num">{r.people.size}</td><td className="num">{r.teamDays.size}</td><td className="num">{r.me}</td><td className="faint">{top}</td></tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>
    </>
  );
}
