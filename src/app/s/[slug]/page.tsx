import Link from "next/link";
import { notFound } from "next/navigation";
import { monthPhase } from "@/lib/month";
import { isEditor, canPost, managerCodeRequired } from "@/lib/auth";
import { getStorePosts, getExamples, signExamples, getMetrics } from "@/lib/data";
import { ExampleGallery } from "@/components/ExampleGallery";
import { HBars, Ring, Stacked, StackedColumns, DotGrid } from "@/components/charts";
import { addDays, monthName, monthsBack, projectToMonthEnd, weeksBack } from "@/lib/fmt";
import { RosterBar } from "@/components/ui";
import { StoreNotes } from "@/components/StoreNotes";
import {
  getStores, getStoreBySlug, storeFamily, getInitiatives, getAllRoster, getVisits, getTodos,
  getWins, getPeople, getBookmarks, getCommitments, getGoals, getGoalEntries,
} from "@/lib/data";
import { fmtDate, relDay, today, storeAccent } from "@/lib/fmt";
import { InitiativeCard, TodoList, VisitList, WinList, CommitmentList, Sparkline } from "@/components/ui";
import { MonthPanel } from "@/components/MonthPanel";
import { FileUploader } from "@/components/FileUploader";
import { ReportsCard } from "@/components/ReportsCard";
import { updateStore, addBookmark, deleteBookmark, addTodo, addWin, addCommitment, addGoal, addGoalEntry } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function StorePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ phase?: string; posted?: string; code?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const [store, stores, editor, poster] = await Promise.all([getStoreBySlug(slug), getStores(), isEditor(), canPost()]);
  if (!store) notFound();
  const family = storeFamily(store, stores);
  const ids = family.map((s) => s.id);

  const [initiatives, roster, visits, todos, wins, people, bookmarksAll, commitments, goals] = await Promise.all([
    getInitiatives(), getAllRoster(), getVisits({ storeIds: ids, limit: 200 }), getTodos({ storeIds: ids }),
    getWins({ storeIds: ids, limit: 6 }), getPeople(ids), getBookmarks(ids), getCommitments(ids), getGoals({ storeIds: ids }),
  ]);
  const entries = await getGoalEntries(goals.map((g) => g.id));
  const bookmarks = bookmarksAll.filter((b) => !b.initiative_id);
  const posts = await getStorePosts({ storeIds: ids, limit: 30 });
  const peopleIdSet = new Set(people.map((p) => p.id));
  const exAll = await getExamples({ limit: 400 });
  const exHere = exAll.filter((e) => (e.store_id && ids.includes(e.store_id)) || e.person_ids.some((pid) => peopleIdSet.has(pid))).slice(0, 8);
  const examples = await signExamples(exHere);
  const storeInits = initiatives.filter((i) => i.store_ids.some((id) => ids.includes(id)) && i.status !== "done");
  const peopleHere = people.filter((p) => p.active);
  const peopleIds = new Set(peopleHere.map((p) => p.id));

  const plannedHere = visits.filter((v) => v.date > today()).sort((a, b) => a.date.localeCompare(b.date));
  const todayHere = visits.filter((v) => v.date === today());
  const loggedHere = visits.filter((v) => v.date <= today());
  const last = loggedHere[0];
  const next = loggedHere.filter((v) => v.next_visit_date && v.next_visit_date >= today())
    .sort((a, b) => a.next_visit_date!.localeCompare(b.next_visit_date!))[0];


  // ---- charts ----
  const activeInits = storeInits.filter((i) => i.status === "active" || i.status === "sustaining");
  const rosterHere = roster.filter((r) => peopleIds.has(r.person_id) && activeInits.some((i) => i.id === r.initiative_id));
  const trainedPct = rosterHere.length ? Math.round((rosterHere.filter((r) => r.status === "trained" || r.status === "solid").length / rosterHere.length) * 100) : 0;
  const since30 = addDays(today(), -29);
  const visits30 = loggedHere.filter((v) => v.date >= weeksBack(1)[0]).length;
  const initBars = activeInits.map((i) => {
    const ros = roster.filter((r) => r.initiative_id === i.id && peopleIds.has(r.person_id));
    const done = ros.filter((r) => r.status === "trained" || r.status === "solid").length;
    return { label: i.name, value: ros.length ? Math.round((done / ros.length) * 100) : 0, sub: ros.length ? `${done}/${ros.length}` : "no roster", href: `/i/${i.id}?store=${store.slug}`, max: 100 };
  });
  const rosterParts = [
    { label: "Solid", value: rosterHere.filter((r) => r.status === "solid").length, color: "var(--good)" },
    { label: "Trained", value: rosterHere.filter((r) => r.status === "trained").length, color: "var(--brand)" },
    { label: "Follow up", value: rosterHere.filter((r) => r.status === "needs_followup").length, color: "var(--warn)" },
    { label: "Not yet", value: rosterHere.filter((r) => r.status === "not_started").length, color: "var(--line-strong)" },
  ];
  // Shared BDC card for the stores it serves
  const sharedBdcs = family.filter((s) => s.id !== store.id && s.is_bdc);
  const bdcCards = sharedBdcs.map((b) => {
    const folks = people.filter((p) => p.active && p.store_id === b.id);
    const fids = new Set(folks.map((p) => p.id));
    const ros = roster.filter((r) => fids.has(r.person_id) && activeInits.some((i) => i.id === r.initiative_id));
    const lastVisit = visits.find((v) => v.store_id === b.id);
    return { b, folks, ros, lastVisit };
  });
  const servesStores = store.is_bdc ? stores.filter((s) => store.shows_under.includes(s.slug)) : [];

  // Store results from the PR import
  const mi = monthPhase(sp.phase);
  const reflecting = mi.phase === "reflect";
  const curMonth = reflecting ? mi.prevMonth : mi.month;   // first days of the month: look at last month's results
  const metricRows = await getMetrics({ storeIds: [store.id], periods: monthsBack(9) });
  const thisMonthRows = metricRows.filter((m) => m.period === curMonth);
  const soldMtd = thisMonthRows.reduce((a, m) => a + m.sold, 0);
  const soldAsOf = thisMonthRows.map((m) => m.as_of).sort().pop();
  const soldProj = soldAsOf ? projectToMonthEnd(soldMtd, soldAsOf) : null;
  const stackFor = (rowsIn: typeof metricRows) => monthsBack(9).map((m) => {
    const rs = rowsIn.filter((x) => x.period === m);
    const nw = rs.reduce((a, x) => a + (x.new_sold ?? 0), 0);
    const us = rs.reduce((a, x) => a + (x.used_sold ?? (x.new_sold == null ? x.sold : 0)), 0);
    return { label: monthName(m).slice(0, 3), hint: monthName(m), parts: [{ label: "New", value: nw }, { label: "Used", value: us }] };
  });
  const soldStack = stackFor(metricRows);
  const locStack = (l: string) => stackFor(metricRows.filter((x) => x.location === l));
  const soldByMonth = monthsBack(6).map((m) => ({ label: monthName(m).slice(0, 3), value: metricRows.filter((x) => x.period === m).reduce((a, x) => a + x.sold, 0), hint: monthName(m) }));
  const touched = new Set(loggedHere.filter((v) => v.date >= mi.monthStart).flatMap((v) => v.people_ids));
  const reachGroups = (store.locations.length ? [null, ...store.locations] : [null]).map((l) => ({
    label: l || (store.locations.length ? "Main" : store.short_name), color: storeAccent(store),
    people: peopleHere.filter((p) => (l ? p.location === l : !p.location || !store.locations.includes(p.location))).map((p) => ({ name: p.name, on: touched.has(p.id), href: `/p/${p.id}` })),
  })).filter((g) => g.people.length);
  const apptRow = thisMonthRows.reduce((acc, m) => ({ due: acc.due + (m.appts_due || 0), shown: acc.shown + (m.appts_shown || 0), sold: acc.sold + (m.appts_sold || 0) }), { due: 0, shown: 0, sold: 0 });
  const upsRow = thisMonthRows.reduce((acc, m) => ({ lot: acc.lot + (m.lot_ups || 0), phone: acc.phone + (m.phone_ups || 0), web: acc.web + (m.web_ups || 0) }), { lot: 0, phone: 0, web: 0 });

  return (
    <div style={{ ["--accent" as string]: storeAccent(store) }}>
      <div className="pagehead">
        <div>
          <div className="accentbar" />
          <h1>{store.name}</h1>
          <div className="sub small">
            {store.locations.length > 0 && <span>{store.locations.join(" and ")} · </span>}
            {servesStores.length > 0 && <span>{servesStores.map((x, i) => <span key={x.id}>{i ? " and " : ""}<Link href={`/s/${x.slug}`}>{x.short_name}</Link></span>)} · </span>}
            <Link href={`/people?store=${store.slug}`}>{peopleHere.length} people</Link>
          </div>
        </div>
        {editor && <Link href={`/visit/new?store=${store.slug}`} className="btn gold">Log a visit</Link>}
      </div>

      <div className="grid topfold" style={{ marginBottom: 18 }}>
        <div className="stack">
          <section className="card">
            <div className="cardhead"><h2>Next training</h2>{editor && <Link className="more" href={`/visit/new?store=${store.slug}&plan=1`}>Schedule</Link>}</div>
            {todayHere.map((v) => (
              <div key={v.id} className="todaysess"><span className="tag good">Today</span> <Link href={`/v/${v.id}`}><strong>{v.focus || "Visit"}</strong></Link></div>
            ))}
            {plannedHere.length ? (
              <ul className="list">
                {plannedHere.slice(0, 4).map((v) => (
                  <li key={v.id}><div className="grow"><Link href={`/v/${v.id}`}><strong>{fmtDate(v.date, { weekday: true })}</strong></Link> <span className="faint small">{relDay(v.date)}</span>{v.focus && <div className="small" style={{ marginTop: 2 }}>{v.focus}</div>}</div></li>
                ))}
              </ul>
            ) : next ? (
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>{fmtDate(next.next_visit_date!, { weekday: true })}</div>
                <div className="faint small">{relDay(next.next_visit_date)}</div>
                {next.next_visit_plan && <p style={{ marginTop: 6 }}>{next.next_visit_plan}</p>}
              </div>
            ) : <p className="empty">Nothing scheduled</p>}
            {last && <p className="faint small" style={{ marginTop: 10 }}>Last visit <Link href={`/v/${last.id}`}>{fmtDate(last.date)}</Link> ({relDay(last.date)})</p>}
          </section>
        </div>
        <div>
          <section>
            <div className="cardhead"><h2>Initiatives here</h2>{editor && <Link className="more" href="/initiatives">Manage</Link>}</div>
            {storeInits.length ? (
              <div className="grid cols-2 initgrid">
                {storeInits.map((i) => (
                  <InitiativeCard key={i.id} init={i} stores={stores}
                    roster={roster.filter((r) => r.initiative_id === i.id && peopleIds.has(r.person_id))} />
                ))}
              </div>
            ) : <div className="card"><p className="empty">No initiatives assigned to this store yet</p></div>}
          </section>
        </div>
      </div>

      <MonthPanel store={store} family={family} allStores={stores} editor={editor} phaseOverride={sp.phase} basePath={`/s/${store.slug}`} />

      <div className="kpis">
        {!(reflecting && trainedPct === 0) && <div className="kpi"><Ring pct={trainedPct} size={54} color={storeAccent(store)} /><div><div className="v" style={{ fontSize: 15 }}>Trained</div><div className="l">on active initiatives</div></div></div>}
        <div className="kpi"><div><div className="v">{peopleHere.length}</div><div className="l">active people</div></div></div>
        <div className="kpi"><div><div className="v">{visits30}</div><div className="l">visits this week</div></div></div>
        <div className="kpi"><div><div className="v">{todos.length}</div><div className="l">open to-dos</div></div></div>
        <div className="kpi"><div><div className="v">{posts.filter((p) => p.status === "open").length}</div><div className="l">store notes open</div></div></div>
        {soldMtd > 0 && <div className="kpi"><div><div className="v">{soldMtd}</div><div className="l">sold in {monthName(curMonth)}{!reflecting && soldProj && soldProj !== soldMtd ? ` · pacing ${soldProj}` : ""}</div></div></div>}
      </div>

      <div style={{ marginBottom: 20 }}>
        <ReportsCard reports={bookmarks.filter((b) => b.kind === "report")} stores={stores} editor={editor}>
          {editor && (
            <details className="adder" style={{ padding: "0 10px", borderRadius: 8 }}>
              <summary style={{ padding: "4px 0" }}>Add a report or link</summary>
              <form action={addBookmark} className="body" style={{ paddingTop: 6 }}>
                <input type="hidden" name="store_id" value={store.id} />
                <div className="frow">
                  <input type="text" name="title" placeholder="Title (Appointment board)" required />
                  <input type="url" name="url" placeholder="https://" required />
                  <select name="kind"><option value="report">Report</option><option value="tool">Tool</option><option value="doc">Doc</option></select>
                  <button className="btn sm">Add</button>
                </div>
              </form>
              <div className="faint small" style={{ margin: "2px 0 6px" }}>Or upload a PDF or spreadsheet:</div>
              <FileUploader storeId={store.id} />
            </details>
          )}
        </ReportsCard>
        {bookmarks.some((b) => b.kind !== "report") && (
          <div className="bookmarks" style={{ marginTop: 10 }}>
            {bookmarks.filter((b) => b.kind !== "report").map((b) => (
              <span key={b.id} style={{ display: "inline-flex", alignItems: "center" }}>
                <a className="bookmark" href={b.url} target="_blank" rel="noreferrer"><span className="k">{b.kind}</span>{b.title}</a>
                {editor && <form action={deleteBookmark}><input type="hidden" name="id" value={b.id} /><button className="iconbtn" title="Remove">×</button></form>}
              </span>
            ))}
          </div>
        )}
      </div>

      {!(reflecting && trainedPct === 0 && visits30 === 0) && (
      <div className="grid cols-3" style={{ marginBottom: 20 }}>
        <section className="card">
          <div className="cardhead"><h2>Coverage by initiative</h2></div>
          <HBars rows={initBars} unit="%" max={100} />
        </section>
        <section className="card">
          <div className="cardhead"><h2>Roster status</h2></div>
          <Stacked parts={rosterParts} />
        </section>
        <section className="card">
          <div className="cardhead"><h2>Reached in {monthName(mi.month)}</h2></div>
          <DotGrid groups={reachGroups} />
        </section>
      </div>
      )}

      {(soldMtd > 0 || soldByMonth.some((m) => m.value > 0)) && (
        <div className="grid cols-3" style={{ marginBottom: 20 }}>
          <section className="card">
            <div className="cardhead"><h2>Sold by month</h2></div>
            <StackedColumns points={soldStack} colors={[storeAccent(store), "var(--sage)"]} />
            {store.locations.length > 0 && (
              <details className="quiet" style={{ marginTop: 10 }}>
                <summary>{store.locations.join(" and ")}</summary>
                <div className="grid cols-2" style={{ marginTop: 8 }}>
                  {store.locations.map((l) => (
                    <div key={l}>
                      <div className="eyebrow"><Link href={`/s/${store.slug}/at/${l.toLowerCase()}`}>{l}</Link></div>
                      <StackedColumns points={locStack(l)} colors={[storeAccent(store), "var(--sage)"]} height={64} />
                    </div>
                  ))}
                </div>
              </details>
            )}
          </section>
          <section className="card">
            <div className="cardhead"><h2>Appointments, {monthName(curMonth)}</h2></div>
            {apptRow.due > 0 ? (
              <HBars rows={[
                { label: "Due", value: apptRow.due, color: "var(--line-strong)" },
                { label: "Shown", value: apptRow.shown, color: storeAccent(store), sub: `${Math.round((apptRow.shown / apptRow.due) * 100)}%` },
                { label: "Sold", value: apptRow.sold, color: "var(--good)", sub: apptRow.shown ? `${Math.round((apptRow.sold / apptRow.shown) * 100)}% of shown` : undefined },
              ]} max={apptRow.due} />
            ) : <p className="empty">No appointment numbers this month</p>}
          </section>
          <section className="card">
            <div className="cardhead"><h2>Where ups came from, {monthName(curMonth)}</h2></div>
            {upsRow.lot + upsRow.phone + upsRow.web > 0 ? (
              <HBars rows={[
                { label: "Lot", value: upsRow.lot, color: storeAccent(store) },
                { label: "Phone", value: upsRow.phone, color: storeAccent(store) },
                { label: "Web", value: upsRow.web, color: storeAccent(store) },
              ]} />
            ) : <p className="empty">No traffic numbers this month</p>}
          </section>
        </div>
      )}

      <div className="grid main-side">
        <div className="stack">

          {(examples.length > 0 || editor) && (
            <section className="card">
              <div className="cardhead"><h2>Recent examples</h2><Link className="more" href={`/examples?store=${store.slug}`}>{editor ? "Library and upload" : "All examples"}</Link></div>
              <ExampleGallery items={examples} people={people.map((p) => ({ id: p.id, name: p.name }))} initiatives={initiatives.map((i) => ({ id: i.id, name: i.name }))}
                stores={stores.map((s) => ({ id: s.id, name: s.short_name }))} editor={editor} emptyText="No screenshots from this store yet. Add them in the Examples library." />
            </section>
          )}

          <section className="card">
            <div className="cardhead"><h2>Visits</h2><Link className="more" href={`/s/${store.slug}/visits`}>All visits</Link></div>
            <VisitList visits={loggedHere.slice(0, 6)} stores={stores} people={people} showStore={family.length > 1} />
          </section>

          {(goals.length > 0 || editor) && (
            <section className="card">
              <div className="cardhead"><h2>Store goals</h2></div>
              {goals.length ? (
                <div className="grid cols-2">
                  {goals.map((g) => (
                    <div key={g.id} className="card flat">
                      <strong>{g.name}</strong>
                      <Sparkline goal={g} entries={entries} />
                      {editor && (
                        <form action={addGoalEntry} className="inline" style={{ marginTop: 6 }}>
                          <input type="hidden" name="goal_id" value={g.id} />
                          <input type="date" name="date" defaultValue={today()} style={{ width: 140 }} />
                          <input type="number" step="any" name="value" placeholder={g.unit} required style={{ width: 90 }} />
                          <button className="btn sm ghost">Log</button>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
              ) : <p className="empty">No store-level goals. Initiative goals live on each initiative.</p>}
              {editor && (
                <details className="adder" style={{ marginTop: 12 }}>
                  <summary>Store goal</summary>
                  <form action={addGoal} className="body">
                    <input type="hidden" name="store_id" value={store.id} />
                    <div className="frow">
                      <input type="text" name="name" placeholder="Appointment set rate" required />
                      <input type="number" step="any" name="target" placeholder="Target" />
                      <input type="text" name="unit" placeholder="%" defaultValue="%" />
                      <select name="direction"><option value="up">Higher is better</option><option value="down">Lower is better</option></select>
                      <select name="kind"><option value="rate">Rate (%, per call)</option><option value="count">Count this month (appts, units)</option></select>
                    </div>
                    <button className="btn sm">Add goal</button>
                  </form>
                </details>
              )}
            </section>
          )}

          <section className="card">
            <div className="cardhead"><h2>Manager commitments</h2></div>
            <CommitmentList items={commitments} editor={editor} />
            {editor && (
              <details className="adder" style={{ marginTop: 12 }}>
                <summary>Commitment</summary>
                <form action={addCommitment} className="body">
                  <input type="hidden" name="store_id" value={store.id} />
                  <div className="frow">
                    <input type="text" name="owner" placeholder="Manager" required />
                    <input type="text" name="text" placeholder="Daily 9am huddle with appointment board up" required style={{ gridColumn: "span 2" }} />
                    <select name="initiative_id"><option value="">No initiative</option>{storeInits.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
                  </div>
                  <button className="btn sm">Add</button>
                </form>
              </details>
            )}
          </section>
        </div>

        <div className="stack">
          <StoreNotes store={store} posts={posts} editor={editor} canPost={poster} codeRequired={managerCodeRequired()}
            back={`/s/${store.slug}`} flash={sp.posted ? "posted" : sp.code === "bad" ? "badcode" : undefined} />
          {bdcCards.map(({ b, folks, ros, lastVisit }) => (
            <section key={b.id} className="card" style={{ borderLeft: `4px solid ${storeAccent(b)}` }}>
              <div className="cardhead"><h2>{b.name}</h2><Link className="more" href={`/s/${b.slug}`}>Open</Link></div>
              <p className="small muted">Shared with {b.shows_under.filter((x) => x !== store.slug).map((x) => stores.find((y) => y.slug === x)?.short_name).join(", ")} · {folks.length} agent{folks.length === 1 ? "" : "s"}</p>
              <RosterBar roster={ros} />
              {lastVisit && <p className="faint small" style={{ marginTop: 8 }}>Last BDC visit <Link href={`/v/${lastVisit.id}`}>{fmtDate(lastVisit.date)}</Link></p>}
            </section>
          ))}


          <section className="card">
            <div className="cardhead"><h2>To-dos</h2></div>
            <TodoList todos={todos} editor={editor} people={people} />
            {editor && (
              <form action={addTodo} className="inline" style={{ marginTop: 10 }}>
                <input type="hidden" name="store_id" value={store.id} />
                <input type="text" name="text" placeholder="Add a to-do" required style={{ flex: 1, minWidth: 140 }} />
                <input type="date" name="due" style={{ width: 140 }} />
                <button className="btn sm">Add</button>
              </form>
            )}
          </section>

          <section className="card">
            <div className="cardhead"><h2>Wins</h2></div>
            <WinList wins={wins} editor={editor} people={people} />
            {editor && (
              <form action={addWin} style={{ marginTop: 10 }}>
                <input type="hidden" name="store_id" value={store.id} />
                <div className="frow wide"><input type="text" name="text" placeholder="What happened" required /></div>
                <div className="frow">
                  <select name="person_id"><option value="">Who (optional)</option>{peopleHere.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                  <select name="initiative_id"><option value="">Initiative (optional)</option>{storeInits.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
                </div>
                <button className="btn sm">Log win</button>
              </form>
            )}
          </section>
        </div>
      </div>
      {editor && (
        <details className="quiet" style={{ marginTop: 18 }}>
          <summary>Store name</summary>
          <form action={updateStore} className="inline" style={{ marginTop: 8 }}>
            <input type="hidden" name="id" value={store.id} />
            <input type="text" name="name" defaultValue={store.name} placeholder="Full name" style={{ flex: 2, minWidth: 180 }} />
            <input type="text" name="short_name" defaultValue={store.short_name} placeholder="Tab name" style={{ flex: 1, minWidth: 120 }} />
            <button className="btn sm">Save</button>
          </form>
        </details>
      )}
    </div>
  );
}
