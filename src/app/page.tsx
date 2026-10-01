import Link from "next/link";
import { isEditor } from "@/lib/auth";
import { getHubSnapshot, getStorePosts, getMetrics, getMeetings } from "@/lib/data";
import { OpenPosts } from "@/components/StoreNotes";
import { fmtDate, relDay, today } from "@/lib/fmt";
import { monthPhase } from "@/lib/month";
import { monthName } from "@/lib/fmt";
import { InitiativeCard, TodoList, VisitList, WinList } from "@/components/ui";
import { MonthPanel } from "@/components/MonthPanel";
import { WeekCalendar } from "@/components/WeekCalendar";
import { FileUploader } from "@/components/FileUploader";
import { HBars, Columns, Stacked } from "@/components/charts";
import { storeAccent, addDays, navOrder, monthsBack, weeksBack, nextGmMeeting, projectToMonthEnd } from "@/lib/fmt";
import { getBookmarks } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ phase?: string }> }) {
  const sp = await searchParams;
  const [editor, snap, posts, metricsAll, meetings] = await Promise.all([
    isEditor(), getHubSnapshot(), getStorePosts({ openOnly: true, limit: 40 }), getMetrics({ periods: monthsBack(2) }), getMeetings(3),
  ]);
  const bookmarksAll = await getBookmarks();
  const reports = bookmarksAll.filter((b) => !b.initiative_id && b.kind === "report");
  const { stores, initiatives, roster, visits: visitsAll, todos, wins, people } = snap;
  const visits = visitsAll.filter((v) => v.date <= today());        // logged
  const planned = visitsAll.filter((v) => v.date > today());        // scheduled sessions
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
  const weeks = weeksBack(8);
  const visitsByWeek = weeks.map((w, i) => ({ label: fmtDate(w).replace(/,.*$/, ""), value: visits.filter((v) => v.date >= w && v.date < (weeks[i + 1] || addDays(w, 7))).length, hint: `Week of ${fmtDate(w)}` }));
  const rosterActive = roster.filter((r) => activeIds.has(r.initiative_id));
  const rosterParts = [
    { label: "Solid", value: rosterActive.filter((r) => r.status === "solid").length, color: "var(--good)" },
    { label: "Trained", value: rosterActive.filter((r) => r.status === "trained").length, color: "var(--brand)" },
    { label: "Follow up", value: rosterActive.filter((r) => r.status === "needs_followup").length, color: "var(--warn)" },
    { label: "Not yet", value: rosterActive.filter((r) => r.status === "not_started").length, color: "var(--line-strong)" },
  ];
  const kpiTrained = rosterActive.length ? Math.round((rosterActive.filter((r) => r.status === "trained" || r.status === "solid").length / rosterActive.length) * 100) : 0;
  const openPosts = posts.filter((p) => p.status === "open").length;

  // Sold this month (from the PR import), rolled up per store, with pace to month end
  const curMonth = today().slice(0, 7);
  const [prevMonth] = monthsBack(2);
  const soldFor = (sid: string, period: string) => metricsAll.filter((m) => m.store_id === sid && m.period === period);
  const soldRows = navStores.filter((s) => !s.is_bdc || soldFor(s.id, curMonth).length).map((s) => {
    const rows = soldFor(s.id, curMonth);
    const sold = rows.reduce((a, m) => a + m.sold, 0);
    const asOf = rows.map((m) => m.as_of).sort().pop();
    const proj = asOf && asOf < `${curMonth}-${String(new Date(Date.UTC(Number(curMonth.slice(0, 4)), Number(curMonth.slice(5, 7)), 0)).getUTCDate()).padStart(2, "0")}` ? projectToMonthEnd(sold, asOf) : null;
    const prev = soldFor(s.id, prevMonth).reduce((a, m) => a + m.sold, 0);
    return { label: s.short_name, value: sold, color: storeAccent(s), sub: proj ? `pacing ${proj}` : prev ? `${prev} last mo` : undefined, href: `/s/${s.slug}` };
  });
  const soldTotal = soldRows.reduce((a, r) => a + r.value, 0);
  const soldAsOf = metricsAll.filter((m) => m.period === curMonth).map((m) => m.as_of).sort().pop();
  const gmNext = nextGmMeeting();
  const gmAgenda = meetings.find((m) => m.date === gmNext)?.agenda;

  const upcoming = navStores.map((s) => {
    const sess = planned.filter((x) => x.store_id === s.id).sort((a, b) => a.date.localeCompare(b.date))[0];
    const nv = visits.filter((x) => x.store_id === s.id && x.next_visit_date && x.next_visit_date >= today())
      .sort((a, b) => a.next_visit_date!.localeCompare(b.next_visit_date!))[0];
    const next = sess ? { date: sess.date, plan: sess.focus, id: sess.id } : nv ? { date: nv.next_visit_date!, plan: nv.next_visit_plan, id: null } : null;
    const last = visits.find((x) => x.store_id === s.id);
    return { store: s, next, last };
  }).sort((a, b) => (a.next?.date || "9").localeCompare(b.next?.date || "9"));

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
        {soldTotal > 0 && <div className="kpi"><div><div className="v">{soldTotal}</div><div className="l">sold in {monthName(curMonth)}{soldAsOf ? ` thru ${fmtDate(soldAsOf)}` : ""}</div></div></div>}
      </div>

      {(reports.length > 0 || editor) && (
        <div className="bookmarks reports">
          <span className="eyebrow" style={{ alignSelf: "center" }}>Reports</span>
          {reports.map((b) => {
            const s = stores.find((x) => x.id === b.store_id);
            return <a key={b.id} className="bookmark" href={b.url} target="_blank" rel="noreferrer" style={s ? { ["--accent" as string]: storeAccent(s) } : undefined}><span className="k">{s?.short_name || "Group"}</span>{b.title}</a>;
          })}
          {editor && (
            <details className="adder" style={{ padding: "0 10px", borderRadius: 8 }}>
              <summary style={{ padding: "6px 0" }}>Add a group report</summary>
              <div style={{ paddingTop: 6, minWidth: 420 }}><FileUploader storeId={null} /></div>
            </details>
          )}
        </div>
      )}

      <WeekCalendar visits={visitsAll} todos={todos} stores={stores} editor={editor} />

      <MonthPanel store={null} family={primary} allStores={stores} editor={editor} phaseOverride={sp.phase} basePath="/" />

      <div className="grid cols-3" style={{ marginTop: 18 }}>
        <section className="card">
          <div className="cardhead"><h2>Training coverage</h2><span className="faint small">% trained, active initiatives</span></div>
          <HBars rows={coverage} unit="%" max={100} />
        </section>
        <section className="card">
          <div className="cardhead"><h2>Sold in {monthName(curMonth)}</h2>{editor && <Link className="more" href="/import">Import</Link>}</div>
          {soldTotal > 0
            ? <HBars rows={soldRows} />
            : <p className="empty">No results loaded for this month yet.{editor ? " Paste the PR Inputs tab on the import page." : ""}</p>}
          <div style={{ marginTop: 14 }}>
            <div className="cardhead" style={{ marginBottom: 6 }}><h2>Visits, last 30 days</h2></div>
            <HBars rows={visits30} />
          </div>
        </section>
        <section className="card">
          <div className="cardhead"><h2>Visits by week</h2></div>
          <Columns points={visitsByWeek} />
          <div style={{ marginTop: 14 }}>
            <div className="cardhead" style={{ marginBottom: 6 }}><h2>Roster status</h2></div>
            <Stacked parts={rosterParts} />
          </div>
        </section>
      </div>

      <div className="grid main-side" style={{ marginTop: 18 }}>
        <div className="stack">
          <section className="card">
            <div className="cardhead"><h2>Upcoming by store</h2></div>
            <table className="tbl">
              <thead><tr><th>Store</th><th>Next visit</th><th>Plan</th><th>Last visit</th></tr></thead>
              <tbody>
                {upcoming.map(({ store, next, last }) => (
                  <tr key={store.id}>
                    <td><Link href={`/s/${store.slug}`} style={{ fontWeight: 600 }}>{store.short_name}</Link></td>
                    <td>{next ? <><strong>{next.id ? <Link href={`/v/${next.id}`}>{fmtDate(next.date, { weekday: true })}</Link> : fmtDate(next.date, { weekday: true })}</strong> <span className="faint small">{relDay(next.date)}</span></> : <span className="faint">Not scheduled</span>}</td>
                    <td className="muted small">{next?.plan || ""}</td>
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
            <VisitList visits={visits.slice(0, 8)} stores={stores} people={people} showStore />
          </section>
        </div>

        <div className="stack">
          <section className="card groupcard">
            <div className="cardhead"><h2>Group focus</h2><Link className="more" href="/group">Open</Link></div>
            <div className="small"><span className="eyebrow">Next GM meeting</span> <strong>{fmtDate(gmNext, { weekday: true })}</strong> <span className="faint">{relDay(gmNext)}</span></div>
            {gmAgenda && <p className="pre small muted" style={{ marginTop: 4 }}>{gmAgenda}</p>}
          </section>
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
