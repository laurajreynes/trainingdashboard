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
import { ReportsCard } from "@/components/ReportsCard";
import { getTargets, sellingDays, track, targetKey } from "@/lib/tracking";
import { HBars, Stacked, ReachBars } from "@/components/charts";
import { storeAccent, addDays, navOrder, monthsBack, weeksBack, nextGmMeeting, projectToMonthEnd } from "@/lib/fmt";
import { getBookmarks } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ phase?: string }> }) {
  const sp = await searchParams;
  const [editor, snap, posts, metricsAll, meetings] = await Promise.all([
    isEditor(), getHubSnapshot(), getStorePosts({ openOnly: true, limit: 40 }), getMetrics({ periods: monthsBack(9) }), getMeetings(3),
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
  const weekStart = weeksBack(1)[0];
  const visitsWeek = visits.filter((v) => v.date >= weekStart).length;
  const visits30 = navStores.map((s) => ({ label: s.short_name, value: visits.filter((v) => v.store_id === s.id && v.date >= weekStart).length, color: storeAccent(s), href: `/s/${s.slug}/visits` }));
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
  const reflecting = phase.phase === "reflect";
  const curMonth = reflecting ? phase.prevMonth : phase.month;
  const prevMonth = monthsBack(3)[reflecting ? 0 : 1];
  const soldFor = (sid: string, period: string) => metricsAll.filter((m) => m.store_id === sid && m.period === period);
  const soldRows = navStores.filter((s) => !s.is_bdc || soldFor(s.id, curMonth).length).map((s) => {
    const rows = soldFor(s.id, curMonth);
    const sold = rows.reduce((a, m) => a + m.sold, 0);
    const asOf = rows.map((m) => m.as_of).sort().pop();
    const proj = asOf && asOf < `${curMonth}-${String(new Date(Date.UTC(Number(curMonth.slice(0, 4)), Number(curMonth.slice(5, 7)), 0)).getUTCDate()).padStart(2, "0")}` ? projectToMonthEnd(sold, asOf) : null;
    const prev = soldFor(s.id, prevMonth).reduce((a, m) => a + m.sold, 0);
    return { label: s.short_name, value: sold, color: storeAccent(s), sub: !reflecting && proj ? `pacing ${proj}` : prev ? `${prev} prior` : undefined, href: `/s/${s.slug}` };
  });
  const soldTotal = soldRows.reduce((a, r) => a + r.value, 0);
  const groupStack = monthsBack(9).map((m) => {
    const rs = metricsAll.filter((x) => x.period === m);
    return { label: monthName(m).slice(0, 3), hint: monthName(m), parts: [
      { label: "New", value: rs.reduce((a, x) => a + (x.new_sold ?? 0), 0) },
      { label: "Used", value: rs.reduce((a, x) => a + (x.used_sold ?? (x.new_sold == null ? x.sold : 0)), 0) },
    ] };
  });
  const touched = new Set(visits.filter((v) => v.date >= phase.monthStart).flatMap((v) => v.people_ids));
  const reachGroups = navStores.map((s) => ({ label: s.short_name, color: storeAccent(s), href: `/s/${s.slug}`, people: activePeople.filter((p) => p.store_id === s.id).map((p) => ({ name: p.name, on: touched.has(p.id), href: `/p/${p.id}` })) })).filter((g) => g.people.length);
  const monthRows = metricsAll.filter((m) => m.period === curMonth);
  const apptAll = monthRows.reduce((acc, m) => ({ due: acc.due + (m.appts_due || 0), shown: acc.shown + (m.appts_shown || 0), sold: acc.sold + (m.appts_sold || 0) }), { due: 0, shown: 0, sold: 0 });
  const upsAll = monthRows.reduce((acc, m) => ({ lot: acc.lot + (m.lot_ups || 0), phone: acc.phone + (m.phone_ups || 0), web: acc.web + (m.web_ups || 0) }), { lot: 0, phone: 0, web: 0 });
  const soldAsOf = metricsAll.filter((m) => m.period === curMonth).map((m) => m.as_of).sort().pop();
  const targets = await getTargets(phase.month);
  const sd = sellingDays(phase.month);
  const tracking = (() => {
    let withTarget = 0, onPace = 0;
    for (const s of navStores.filter((x) => !x.is_bdc)) {
      for (const loc of [null, ...s.locations]) {
        const t = targets[targetKey(s.id, loc)];
        const goal = t && (t.new !== null || t.used !== null) ? (t.new || 0) + (t.used || 0) : 0;
        if (!goal) continue;
        withTarget++;
        const m = metricsAll.find((x) => x.store_id === s.id && (x.location || null) === loc && x.period === phase.month);
        const done = m ? sd.dates.filter((d) => d <= m.as_of).length : sd.done;
        if (m && track(m.sold, done, sd.total) >= goal) onPace++;
      }
    }
    return { withTarget, onPace };
  })();
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
        <ReachBars compact rows={reachGroups.map((g) => ({ label: g.label, reached: g.people.filter((p) => p.on).length, total: g.people.length, color: g.color, href: g.href }))} />
        {editor && <Link href="/visit/new" className="btn gold">Log a visit</Link>}
      </div>

      <WeekCalendar visits={visitsAll} todos={todos} stores={stores} editor={editor} />

      <div className="kpis">
        <Link href="/initiatives" className="kpi"><div><div className="v">{active.length}</div><div className="l">active initiative{active.length === 1 ? "" : "s"}</div></div></Link>
        <Link href="/tracking" className="kpi"><div><div className="v">{tracking.withTarget ? `${tracking.onPace}/${tracking.withTarget}` : "–"}</div><div className="l">{tracking.withTarget ? "stores tracking to goal" : "set targets to track"}</div></div></Link>
        <div className="kpi"><div><div className="v">{visitsWeek}</div><div className="l">visits this week</div></div></div>
        <Link href="/todos" className="kpi"><div><div className="v">{open.length}</div><div className="l">open to-dos</div></div></Link>
      </div>

      <section style={{ marginBottom: 18 }}>
        <div className="cardhead"><h2>Initiatives</h2><Link className="more" href="/initiatives">All</Link></div>
        {active.length ? (
          <div className="grid cols-3">
            {active.map((i) => <InitiativeCard key={i.id} init={i} roster={roster.filter((r) => r.initiative_id === i.id)} stores={stores} />)}
          </div>
        ) : (
          <div className="card"><p className="empty">No initiatives yet. <Link href="/initiatives">Create the first one.</Link></p></div>
        )}
      </section>

      <ReportsCard reports={reports} stores={stores} editor={editor}>
        {editor && (
          <details className="adder" style={{ padding: "0 10px", borderRadius: 8 }}>
            <summary style={{ padding: "4px 0" }}>Add a group report</summary>
            <div style={{ paddingTop: 6, minWidth: 420 }}><FileUploader storeId={null} /></div>
          </details>
        )}
      </ReportsCard>

      <div style={{ marginTop: 18 }}>
        <MonthPanel store={null} family={primary} allStores={stores} editor={editor} phaseOverride={sp.phase} basePath="/" />
      </div>

      <div className="grid cols-3" style={{ marginTop: 18 }}>
        <section className="card">
          <div className="cardhead"><h2>Sold in {monthName(curMonth)}</h2>{editor && <Link className="more" href="/tracking">Tracking</Link>}</div>
          {soldTotal > 0 ? <HBars rows={soldRows} /> : <p className="empty">No numbers yet. <Link href="/tracking">Enter month to date</Link>.</p>}
        </section>
        {reflecting && apptAll.due > 0 ? (
          <section className="card">
            <div className="cardhead"><h2>Appointments, {monthName(curMonth)}</h2></div>
            <HBars rows={[
              { label: "Due", value: apptAll.due, color: "var(--line-strong)" },
              { label: "Shown", value: apptAll.shown, color: "var(--brand)", sub: `${Math.round((apptAll.shown / apptAll.due) * 100)}%` },
              { label: "Sold", value: apptAll.sold, color: "var(--good)", sub: apptAll.shown ? `${Math.round((apptAll.sold / apptAll.shown) * 100)}% of shown` : undefined },
            ]} max={apptAll.due} />
            {upsAll.lot + upsAll.phone + upsAll.web > 0 && <div style={{ marginTop: 14 }}>
              <div className="cardhead" style={{ marginBottom: 6 }}><h2>Where ups came from</h2></div>
              <HBars rows={[{ label: "Lot", value: upsAll.lot, color: "var(--forest)" }, { label: "Phone", value: upsAll.phone, color: "var(--brand)" }, { label: "Web", value: upsAll.web, color: "var(--info)" }]} />
            </div>}
          </section>
        ) : null}
        <section className="card">
          <div className="cardhead"><h2>Training coverage</h2></div>
          <HBars rows={coverage} unit="%" max={100} />
          <div style={{ marginTop: 14 }}><Stacked parts={rosterParts} /></div>
        </section>
      </div>

      <div className="grid main-side" style={{ marginTop: 18 }}>
        <div className="stack">
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
