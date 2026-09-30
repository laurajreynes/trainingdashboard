import Link from "next/link";
import { isEditor } from "@/lib/auth";
import { getHubSnapshot, getStorePosts } from "@/lib/data";
import { OpenPosts } from "@/components/StoreNotes";
import { fmtDate, relDay, today } from "@/lib/fmt";
import { monthPhase } from "@/lib/month";
import { monthName } from "@/lib/fmt";
import { InitiativeCard, TodoList, VisitList, WinList } from "@/components/ui";
import { MonthPanel } from "@/components/MonthPanel";
import { HBars, Columns, Stacked } from "@/components/charts";
import { storeAccent, addDays, navOrder, monthsBack } from "@/lib/fmt";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ phase?: string }> }) {
  const sp = await searchParams;
  const [editor, snap, posts] = await Promise.all([isEditor(), getHubSnapshot(), getStorePosts({ openOnly: true, limit: 40 })]);
  const { stores, initiatives, roster, visits, todos, wins, people } = snap;
  const primary = stores.filter((s) => !s.is_bdc);
  const active = initiatives.filter((i) => i.status === "active" || i.status === "planning");
  const open = todos.filter((t) => !t.done);

  const phase = monthPhase(sp.phase);

  // ---- chart data ----
  const navStores = navOrder(stores);
  const activeIds = new Set(initiatives.filter((i) => i.status === "active" || i.status === "sustaining").map((i) => i.id));
  const activePeople = people.filter((p) => p.active);
  const coverage = navStores.map((s) => {
    const folks = activePeople.filter((p) => p.store_id === s.id);
    const inits = initiatives.filter((i) => activeIds.has(i.id) && i.store_ids.includes(s.id));
    const slots = folks.length * inits.length;
    const done = roster.filter((r) => activeIds.has(r.initiative_id) && (r.status === "trained" || r.status === "solid") && folks.some((p) => p.id === r.person_id) && inits.some((i) => i.id === r.initiative_id)).length;
    return { label: s.short_name, value: slots ? Math.round((done / slots) * 100) : 0, color: storeAccent(s), sub: slots ? `${done}/${slots}` : "no roster", href: `/s/${s.slug}`, max: 100 };
  });
  const since30 = addDays(today(), -29);
  const visits30 = navStores.map((s) => ({ label: s.short_name, value: visits.filter((v) => v.store_id === s.id && v.date >= since30).length, color: storeAccent(s), href: `/s/${s.slug}/visits` }));
  const months = monthsBack(6);
  const visitsByMonth = months.map((m) => ({ label: monthName(m).slice(0, 3), value: visits.filter((v) => v.date.startsWith(m)).length, hint: monthName(m) }));
  const rosterActive = roster.filter((r) => activeIds.has(r.initiative_id));
  const rosterParts = [
    { label: "Solid", value: rosterActive.filter((r) => r.status === "solid").length, color: "var(--good)" },
    { label: "Trained", value: rosterActive.filter((r) => r.status === "trained").length, color: "var(--brand)" },
    { label: "Follow up", value: rosterActive.filter((r) => r.status === "needs_followup").length, color: "var(--warn)" },
    { label: "Not yet", value: rosterActive.filter((r) => r.status === "not_started").length, color: "var(--line-strong)" },
  ];
  const kpiTrained = rosterActive.length ? Math.round((rosterActive.filter((r) => r.status === "trained" || r.status === "solid").length / rosterActive.length) * 100) : 0;
  const openPosts = posts.filter((p) => p.status === "open").length;

  const upcoming = primary.map((s) => {
    const next = visits.filter((x) => x.store_id === s.id && x.next_visit_date && x.next_visit_date >= today())
      .sort((a, b) => a.next_visit_date!.localeCompare(b.next_visit_date!))[0];
    const last = visits.find((x) => x.store_id === s.id);
    return { store: s, next, last };
  }).sort((a, b) => (a.next?.next_visit_date || "9").localeCompare(b.next?.next_visit_date || "9"));

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">All stores</div>
          <h1>{monthName(phase.month)}</h1>
        </div>
        {editor && <Link href="/visit/new" className="btn gold">Log a visit</Link>}
      </div>

      <div className="kpis">
        <div className="kpi"><div><div className="v">{activePeople.length}</div><div className="l">people on rosters</div></div></div>
        <div className="kpi"><div><div className="v">{kpiTrained}%</div><div className="l">trained on active initiatives</div></div></div>
        <div className="kpi"><div><div className="v">{visits.filter((v) => v.date >= since30).length}</div><div className="l">visits, last 30 days</div></div></div>
        <div className="kpi"><div><div className="v">{open.length}</div><div className="l">open to-dos</div></div></div>
        <div className="kpi"><div><div className="v">{openPosts}</div><div className="l">store notes waiting</div></div></div>
      </div>

      <MonthPanel store={null} family={primary} allStores={stores} editor={editor} phaseOverride={sp.phase} basePath="/" />

      <div className="grid cols-3" style={{ marginTop: 18 }}>
        <section className="card">
          <div className="cardhead"><h2>Training coverage</h2><span className="faint small">% trained, active initiatives</span></div>
          <HBars rows={coverage} unit="%" max={100} />
        </section>
        <section className="card">
          <div className="cardhead"><h2>Visits, last 30 days</h2></div>
          <HBars rows={visits30} />
        </section>
        <section className="card">
          <div className="cardhead"><h2>Visits by month</h2></div>
          <Columns points={visitsByMonth} />
          <div style={{ marginTop: 14 }}>
            <div className="cardhead" style={{ marginBottom: 6 }}><h2>Roster status</h2></div>
            <Stacked parts={rosterParts} />
          </div>
        </section>
      </div>

      <div className="grid main-side" style={{ marginTop: 18 }}>
        <div className="stack">
          <section className="card">
            <div className="cardhead"><h2>Where I&apos;m headed</h2></div>
            <table className="tbl">
              <thead><tr><th>Store</th><th>Next visit</th><th>Plan</th><th>Last visit</th></tr></thead>
              <tbody>
                {upcoming.map(({ store, next, last }) => (
                  <tr key={store.id}>
                    <td><Link href={`/s/${store.slug}`} style={{ fontWeight: 600 }}>{store.short_name}</Link></td>
                    <td>{next ? <><strong>{fmtDate(next.next_visit_date!, { weekday: true })}</strong> <span className="faint small">{relDay(next.next_visit_date)}</span></> : <span className="faint">Not scheduled</span>}</td>
                    <td className="muted small">{next?.next_visit_plan || ""}</td>
                    <td className="muted small">{last ? <Link href={`/v/${last.id}`}>{fmtDate(last.date)}</Link> : "Never"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {phase.phase !== "reflect" && (
            <section>
              <div className="cardhead"><h2>Active initiatives</h2><Link className="more" href="/initiatives">All initiatives</Link></div>
              {active.length ? (
                <div className="grid cols-2">
                  {active.map((i) => <InitiativeCard key={i.id} init={i} roster={roster.filter((r) => r.initiative_id === i.id)} stores={stores} />)}
                </div>
              ) : (
                <div className="card"><p className="empty">No initiatives yet. <Link href="/initiatives">Create the first one.</Link></p></div>
              )}
            </section>
          )}

          <section className="card">
            <div className="cardhead"><h2>Recent visits</h2></div>
            <VisitList visits={visits.slice(0, 8)} stores={stores} showStore />
          </section>
        </div>

        <div className="stack">
          <OpenPosts posts={posts} stores={stores} editor={editor} />
          <section className="card">
            <div className="cardhead"><h2>Open to-dos</h2><Link className="more" href="/todos">All</Link></div>
            <TodoList todos={open.slice(0, 10)} editor={editor} stores={stores} people={people} showStore />
          </section>
          {phase.phase !== "close" && (
            <section className="card">
              <div className="cardhead"><h2>Recent wins</h2></div>
              <WinList wins={wins.slice(0, 6)} editor={editor} people={people} stores={stores} showStore />
            </section>
          )}
        </div>
      </div>
    </>
  );
}
