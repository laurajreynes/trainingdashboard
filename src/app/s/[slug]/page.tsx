import Link from "next/link";
import { EXAMPLE_KIND_LABEL, shortInitName, stepFor } from "@/lib/types";
import type { Initiative } from "@/lib/types";
import { notFound } from "next/navigation";
import { monthPhase } from "@/lib/month";
import { isEditor, canPost, managerCodeRequired } from "@/lib/auth";
import { getTargets } from "@/lib/tracking";
import { getStorePosts, getExamples, getMetrics, getStages, getAreas, getResources, getBulletin } from "@/lib/data";
import { Bulletin } from "@/components/Bulletin";
import { StoreFocus } from "@/components/StoreFocus";
import { ActivityCard, type Activity } from "@/components/ActivityCard";
import { CarWarsBanner } from "@/components/CarWars";
import { BdcFirst } from "@/components/BdcFirst";
import { PeoplePopup } from "@/components/PeoplePopup";
import { getBoard, boardUrl } from "@/lib/board";
import { ApptBoardCard, ApptPeopleCard } from "@/components/ApptBoard";
import { getGroupNotes } from "@/lib/data";
import { HBars, StackedColumns } from "@/components/charts";
import { addDays, monthName, monthsBack, projectToMonthEnd, weeksBack } from "@/lib/fmt";
import { RosterBar } from "@/components/ui";
import { StoreNotes } from "@/components/StoreNotes";
import {
  getStores, getStoreBySlug, storeFamily, getInitiatives, getAllRoster, getVisits, getTodos,
  getWins, getPeople, getBookmarks, getCommitments, getGoals, getGoalEntries,
} from "@/lib/data";
import { fmtDate, relDay, today, storeAccent } from "@/lib/fmt";
import { TodoList, VisitList, WinList } from "@/components/ui";
import { InitiativeCard } from "@/components/InitiativeCard";
import { MonthPanel } from "@/components/MonthPanel";
import { FileUploader } from "@/components/FileUploader";
import { ReportsCard } from "@/components/ReportsCard";
import { Model } from "@/components/Model";
import { splitTime } from "@/components/WeekCalendar";
import { addStorePost, updateStore, addBookmark, deleteBookmark, addTodo, addWin } from "@/app/actions";
import { StoreGoals } from "@/components/StoreGoals";

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
  const [stages, areas] = await Promise.all([getStages(), getAreas()]);
  const bookmarks = bookmarksAll.filter((b) => !b.initiative_id && (b.store_id === store.id || b.store_id === null));   // this store and group-wide; the shared BDC keeps its own
  const posts = await getStorePosts({ storeIds: ids, limit: 30 });
  const bulletin = await getBulletin();
  const board = await getBoard(store.slug);
  const carwars = initiatives.find((i) => /carwars/i.test(i.name) && i.status !== "done" && i.store_ids.includes(store.id));
  const groupNotes = await getGroupNotes();
  const carwarsDates = groupNotes.find((n) => n.key === "carwars")?.body || null;
  const focusText = groupNotes.find((n) => n.key === `focus:${store.id}`)?.body || null;
  const activity = (() => { try { const b = groupNotes.find((n) => n.key === `activity:${store.slug}`)?.body; return b ? (JSON.parse(b) as Activity) : null; } catch { return null; } })();
  const ownIds = new Set(people.filter((p) => p.store_id === store.id).map((p) => p.id));   // this store's people, not the shared BDC's
  const exAll = await getExamples({ limit: 400 });
  const exHere = exAll.filter((e) => e.store_id === store.id || e.person_ids.some((pid) => ownIds.has(pid))).slice(0, 8);
  const storeInits = initiatives.filter((i) => i.store_ids.some((sid) => ids.includes(sid)) && i.status !== "done" && !/carwars/i.test(i.name));   // this store plus the shared BDC: the BDC is part of the dealership
  const activityInit = storeInits.find((i) => /text|lead response|calls over|phone|reasons/i.test(i.name) && i.store_ids.includes(store.id)) || null;
  const peopleHere = people.filter((p) => p.active);
  const peopleIds = new Set(peopleHere.map((p) => p.id));

  const plannedHere = visits.filter((v) => v.date > today()).sort((a, b) => a.date.localeCompare(b.date));
  const todayHere = visits.filter((v) => v.date === today()).sort((a, b) => splitTime(a.focus).minutes - splitTime(b.focus).minutes);
  // This store's sessions plus the shared BDC's, today first, then the next few
  const upcomingHere = [...todayHere, ...plannedHere.sort((a, b) => a.date.localeCompare(b.date) || splitTime(a.focus).minutes - splitTime(b.focus).minutes)].slice(0, 6);
  const loggedHere = visits.filter((v) => v.date <= today());
  const last = loggedHere[0];
  const next = loggedHere.filter((v) => v.next_visit_date && v.next_visit_date >= today())
    .sort((a, b) => a.next_visit_date!.localeCompare(b.next_visit_date!))[0];


  // ---- charts ----
  const activeInits = storeInits.filter((i) => i.status === "active" || i.status === "sustaining");
  // Resources: word tracks and scripts on this store's initiatives, plus files uploaded to them
  const resourceLists = await Promise.all(storeInits.map((i) => getResources(i.id)));
  // On the store's own page the store name in a title is noise: "Text Strategy, Gallatin Subaru" reads "Text Strategy".
  const trimStore = (t: string) => t.replace(new RegExp(`^(${[store.name, store.short_name].map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s*[:,-]\\s*`, "i"), "").replace(new RegExp(`\\s*[,(:·-]?\\s*\\(?(${[store.name, store.short_name].map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\)?\\s*$`, "i"), "").trim() || t;
  const resources = storeInits.flatMap((i, k) => resourceLists[k].map((r) => ({ ...r, title: trimStore(r.title), initName: i.name })));
  const fileResources = bookmarksAll.filter((b) => b.kind === "doc" && b.initiative_id && storeInits.some((i) => i.id === b.initiative_id)).map((b) => ({ ...b, title: trimStore(b.title), initName: storeInits.find((i) => i.id === b.initiative_id)!.name }));
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
  const lateMonth = mi.day > 10;   // after the 10th last month's reports are old news: they move to the bottom
  const reflecting = mi.phase === "reflect";
  const curMonth = reflecting ? mi.prevMonth : mi.month;   // first days of the month: look at last month's results
  const lastYearPeriod = `${Number(curMonth.slice(0, 4)) - 1}${curMonth.slice(4)}`;
  const [metricRows, lyRows, targets] = await Promise.all([
    getMetrics({ storeIds: [store.id], periods: monthsBack(9) }),
    getMetrics({ storeIds: [store.id], periods: [lastYearPeriod] }),
    getTargets(curMonth),
  ]);
  const lyTotal = lyRows.reduce((a, m) => a + m.sold, 0);
  const tgt = targets[store.id];
  const goalTotal = tgt && (tgt.new || tgt.used) ? (tgt.new || 0) + (tgt.used || 0) : null;
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
  const isMgr = (role: string) => /manager|^gm$|general manager/i.test(role);
  const reachGroups = (store.locations.length ? [null, ...store.locations] : [null]).map((l) => ({
    label: l || (store.locations.length ? "Main" : store.short_name), color: storeAccent(store),
    people: peopleHere.filter((p) => !isMgr(p.role) && (l ? p.location === l : !p.location || !store.locations.includes(p.location))).map((p) => ({ name: p.name, on: touched.has(p.id), href: `/p/${p.id}` })),
  })).filter((g) => g.people.length);
  const apptRow = thisMonthRows.reduce((acc, m) => ({ due: acc.due + (m.appts_due || 0), shown: acc.shown + (m.appts_shown || 0), sold: acc.sold + (m.appts_sold || 0) }), { due: 0, shown: 0, sold: 0 });
  const upsRow = thisMonthRows.reduce((acc, m) => ({ lot: acc.lot + (m.lot_ups || 0), phone: acc.phone + (m.phone_ups || 0), web: acc.web + (m.web_ups || 0) }), { lot: 0, phone: 0, web: 0 });

  return (
    <div style={{ ["--accent" as string]: storeAccent(store) }} data-keep="root">
      <div className="pagehead" data-keep>
        <div>
          <div className="accentbar" />
          <h1>{store.name}</h1>
          <div className="sub small">
            {store.locations.length > 0 && <span>{store.locations.join(" and ")} · </span>}
            {servesStores.length > 0 && <span>{servesStores.map((x, i) => <span key={x.id}>{i ? " and " : ""}<Link href={`/s/${x.slug}`}>{x.short_name}</Link></span>)} · </span>}
            <PeoplePopup rows={peopleHere.map((p) => { const rs = roster.filter((r) => r.person_id === p.id && storeInits.some((i) => i.id === r.initiative_id)); const last = visits.filter((v) => v.date <= today() && v.people_ids.includes(p.id)).map((v) => v.date).sort().pop() || null; return { id: p.id, name: p.name, role: p.role, last, lastLabel: last ? fmtDate(last, { weekday: true }) : null, trained: rs.filter((r) => r.status === "trained" || r.status === "solid").length, total: rs.length, group: p.location || store.short_name }; })} groups={[store.short_name, ...[...store.locations].sort()]} label={`${peopleHere.length} people`} title={`${store.short_name}: who is here`} />
          </div>
        </div>
        {editor && <Link href={`/visit/new?store=${store.slug}`} className="btn gold">Log a visit</Link>}
      </div>

      <div data-keep><StoreFocus storeId={store.id} body={focusText} editor={editor} /></div>
      <div data-keep>{carwars && <CarWarsBanner init={carwars} roster={roster} stores={stores} store={store} peopleIds={peopleIds} launches={carwarsDates} withBdc={!store.is_bdc && /toyota|chevrolet/i.test(store.short_name)} />}</div>

      <div className="flow topband">
      <section className="card nextstrip">
        <div className="cardhead"><h2>Next training visit</h2>{editor && <Link className="more" href={`/visit/new?store=${store.slug}&plan=1`}>Schedule</Link>}</div>
        {upcomingHere.length ? (
          <div className="nextrow">
            {upcomingHere.map((v) => {
              const { time, text } = splitTime(v.focus);
              const isToday = v.date === today();
              return (
                <Link key={v.id} href={`/v/${v.id}`} className={`nextitem${isToday ? " today" : ""}`} style={v.store_id !== store.id ? { ["--accent" as string]: storeAccent(stores.find((s) => s.id === v.store_id)) } : undefined}>
                  <span className="when">{isToday ? "Today" : fmtDate(v.date, { weekday: true })}{time ? ` · ${time}` : ""}{v.store_id !== store.id ? ` · ${stores.find((s) => s.id === v.store_id)?.short_name || ""}` : ""}</span>
                  <span className="what">{trimStore(text || v.focus || "Visit").replace(/,?\s*until .*$/i, "") || "Visit"}</span>
                  {v.initiative_ids.length > 0 && <span className="tags">{v.initiative_ids.map((iid) => initiatives.find((i) => i.id === iid)).filter(Boolean).map((i) => <span key={i!.id} className="tag area">{i!.name}</span>)}</span>}
                </Link>
              );
            })}
          </div>
        ) : (
          <form action={addStorePost} className="reqvisit">
            <input type="hidden" name="store_id" value={store.id} />
            <input type="hidden" name="kind" value="question" />
            <input type="hidden" name="back" value={`/s/${store.slug}`} />
            <input type="text" name="website" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: -9999 }} aria-hidden="true" />
            <div className="eyebrow" style={{ marginBottom: 6 }}>Request a visit</div>
            <div className="frow">
              <input type="text" name="author" placeholder="Your name" required />
              <input type="text" name="topic" placeholder="Topic (optional)" />
            </div>
            <input type="hidden" name="body" value="Visit requested" />
            <button className="btn sm">Send to Laura</button>
          </form>
        )}
      </section>
      <section className="card">
        <div className="cardhead"><h2>Initiatives here</h2>{editor && <Link className="more" href="/initiatives">Manage</Link>}</div>
        {storeInits.length ? (
          <div className="initstack">
            {(() => {
              // Main store first, then each location's own initiatives under a small heading
              const locOf = (i: Initiative) => store.locations.find((l) => new RegExp(`^${l}\\b`, "i").test(i.name)) || "";
              const groups = ["", ...[...store.locations].sort()].map((l) => ({ l, items: storeInits.filter((i) => locOf(i) === l) })).filter((g) => g.items.length);
              return groups.map((g) => (
                <div key={g.l || "main"} className="initgroup">
                  {g.l && <div className="eyebrow" style={{ margin: "6px 0 2px" }}>{g.l}</div>}
                  {g.items.map((i) => (
                    <InitiativeCard key={i.id} init={i} stores={stores} stage={stages[i.id]} area={areas[i.id]} hideStore={store.slug}
                      roster={roster.filter((r) => r.initiative_id === i.id && peopleIds.has(r.person_id))} />
                  ))}
                </div>
              ));
            })()}
          </div>
        ) : <p className="empty">No initiatives assigned to this store yet</p>}
      </section>
        <div className="stack">
      {!lateMonth && (
      <div>
        <ReportsCard reports={bookmarks.filter((b) => b.kind === "report")} stores={stores} editor={editor} compact>
          {editor && (
            <details className="adder" style={{ padding: "0 10px", borderRadius: 8 }}>
              <summary style={{ padding: "4px 0" }}>Add</summary>
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
      </div>
      )}
      {(resources.length > 0 || fileResources.length > 0 || bookmarks.some((b) => b.kind !== "report")) && (
        <section className="card">
          <div className="cardhead"><h2>Resources</h2></div>
          <div className="grid-chips rsrc">
            {bookmarks.filter((b) => b.kind !== "report").map((b) => (
              <span key={b.id} style={{ display: "inline-flex", alignItems: "center" }}>
                <a className="chipr tool" href={b.url} target="_blank" rel="noreferrer"><span className="k">{b.kind}</span><span className="t">{b.title}</span></a>
                {editor && <form action={deleteBookmark}><input type="hidden" name="id" value={b.id} /><button className="iconbtn" title="Remove">×</button></form>}
              </span>
            ))}
            {fileResources.map((b) => <a key={b.id} className="chipr" href={b.url} target="_blank" rel="noreferrer" title={b.initName}><span className="t">{b.title}</span></a>)}
            {resources.map((r) => r.url
              ? <a key={r.id} className="chipr" href={r.url} target="_blank" rel="noreferrer" title={r.initName}>{r.kind !== "doc" && <span className="k">{r.kind.replace("_", " ")}</span>}<span className="t">{r.title}</span></a>
              : <Link key={r.id} className="chipr" href={`/i/${r.initiative_id}`} title={r.initName}><span className="k">{r.kind.replace("_", " ")}</span><span className="t">{r.title}</span></Link>)}
          </div>
        </section>
      )}
        </div>
      </div>

      {(() => {
        const bdcInit = initiatives.find((i) => /BDC October/i.test(i.name) && i.status !== "done");
        const bdcStore = stores.find((s) => s.is_bdc);
        if (!bdcInit || store.is_bdc || !/toyota|chevrolet/i.test(store.short_name)) return null;
        return <BdcFirst store={store} bdcInit={bdcInit} storeInits={storeInits.filter((i) => !i.store_ids.includes(bdcStore?.id || ""))} roster={roster} bdcStore={bdcStore} />;
      })()}






      {activity && <ActivityCard data={activity} people={people} initiative={activityInit} color={storeAccent(store)} />}
      <Model compact marks={storeInits.map((i) => ({ step: stepFor(i.name, areas[i.id]), label: shortInitName(i.name), color: storeAccent(stores.find((x) => i.store_ids.includes(x.id)) || store) })).filter((m): m is { step: string; label: string; color: string } => !!m.step)} />



      <div data-keep><MonthPanel store={store} family={family} allStores={stores} editor={editor} phaseOverride={sp.phase} basePath={`/s/${store.slug}`} /></div>

      <div className="grid cols-3" style={{ marginTop: 18, marginBottom: 20, alignItems: "start" }}>
          {!store.is_bdc && (
          <section className="card">
            <div className="cardhead"><h2>Sold by month</h2></div>
            <StackedColumns points={soldStack} colors={[storeAccent(store), "var(--sage)"]} marks={[
              ...(goalTotal ? [{ label: "Goal", value: goalTotal, kind: "goal" as const }] : []),
              ...(!reflecting && soldProj && soldProj !== soldMtd ? [{ label: "Pace", value: soldProj, kind: "pace" as const }] : []),
              ...(lyTotal && !goalTotal ? [{ label: "Last year", value: lyTotal, kind: "ref" as const }] : []),
            ]} />
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
          )}
        <section className="card">
          <div className="cardhead"><h2>Coverage by initiative</h2></div>
          <HBars rows={initBars} unit="%" max={100} />
          <p className="small muted" style={{ marginTop: 10 }}>
            {reachGroups.map((g, i) => <span key={g.label}>{i ? " · " : ""}{reachGroups.length > 1 ? `${g.label} ` : ""}{g.people.filter((p) => p.on).length} of {g.people.length} worked with in {monthName(mi.month)}</span>)}
          </p>
        </section>
      </div>

      {board && (
        <div className="grid fit" data-keep style={{ marginBottom: 20, alignItems: "start" }}>
          {board && <ApptBoardCard board={board} url={boardUrl(store.slug)} color={storeAccent(store)} title={`Appointments, ${monthName(curMonth)}`} />}
          {board && <ApptPeopleCard board={board} color={storeAccent(store)} title="Top appointment setters" url={boardUrl(store.slug)} />}
        </div>
      )}

      <div className="flow">
        <div className="stack">
          <section className="card">
            <div className="cardhead"><h2>Visits</h2><Link className="more" href={`/s/${store.slug}/visits`}>All visits</Link></div>
            <VisitList visits={loggedHere.slice(0, 6)} stores={stores} people={people} showStore={family.length > 1} />
          </section>
          {lateMonth && (
      <div>
        <ReportsCard reports={bookmarks.filter((b) => b.kind === "report")} stores={stores} editor={editor} compact>
          {editor && (
            <details className="adder" style={{ padding: "0 10px", borderRadius: 8 }}>
              <summary style={{ padding: "4px 0" }}>Add</summary>
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
      </div>
          )}
        </div>
        <div className="stack">
          <section className="card">
            <div className="cardhead"><h2>Wins and examples</h2><Link className="more" href={`/examples?store=${store.slug}`}>Examples library</Link></div>
            <WinList wins={wins} editor={editor} people={people} />
            {exHere.some((e) => !wins.some((w) => w.person_id && e.person_ids.includes(w.person_id) && w.date === e.taken_on)) && (
              <ul className="list" style={{ marginTop: 6 }}>
                {exHere.filter((e) => !wins.some((w) => w.person_id && e.person_ids.includes(w.person_id) && w.date === e.taken_on)).slice(0, 6).map((e) => {
                  const who = e.person_ids.map((pid) => people.find((p) => p.id === pid)?.name).filter(Boolean).join(", ");
                  return (
                    <li key={e.id}>
                      <span className={`tag ${e.kind === "good" ? "good" : e.kind === "opportunity" ? "warn" : "info"}`} style={{ flex: "none" }}>{EXAMPLE_KIND_LABEL[e.kind]}</span>
                      <div className="grow small">
                        <div><strong>{who || "Team"}</strong>{e.theme ? <span className="faint"> · {e.theme}</span> : null}<span className="faint"> · {fmtDate(e.taken_on)}</span></div>
                        {e.caption && <div className="muted">{e.caption.length > 140 ? e.caption.slice(0, 140) + "…" : e.caption}</div>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
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
          {editor && (
          <section className="card">
            <div className="cardhead"><h2>To-dos</h2></div>
            <TodoList todos={todos.filter((t) => t.store_id === store.id)} editor={editor} people={people} />
            {editor && (
              <form action={addTodo} className="inline" style={{ marginTop: 10 }}>
                <input type="hidden" name="store_id" value={store.id} />
                <input type="text" name="text" placeholder="Add a to-do" required style={{ flex: 1, minWidth: 140 }} />
                <input type="date" name="due" style={{ width: 140 }} />
                <button className="btn sm">Add</button>
              </form>
            )}
          </section>
          )}
        </div>
        <div className="stack">
          <Bulletin items={bulletin} stores={stores} store={store} initiatives={initiatives} />
          <StoreNotes store={store} posts={posts} editor={editor} canPost={poster} codeRequired={managerCodeRequired()}
            back={`/s/${store.slug}`} flash={sp.posted ? "posted" : sp.code === "bad" ? "badcode" : undefined} />
          <StoreGoals store={store} goals={goals} entries={entries} editor={editor} />
          {bdcCards.map(({ b, folks, ros, lastVisit }) => (
            <section key={b.id} className="card" style={{ borderLeft: `4px solid ${storeAccent(b)}` }}>
              <div className="cardhead"><h2>{b.name}</h2><Link className="more" href={`/s/${b.slug}`}>Open</Link></div>
              <p className="small muted">Shared with {b.shows_under.filter((x) => x !== store.slug).map((x) => stores.find((y) => y.slug === x)?.short_name).join(", ")} · {folks.length} agent{folks.length === 1 ? "" : "s"}</p>
              <RosterBar roster={ros} />
              {lastVisit && <p className="faint small" style={{ marginTop: 8 }}>Last BDC visit <Link href={`/v/${lastVisit.id}`}>{fmtDate(lastVisit.date)}</Link></p>}
            </section>
          ))}

        </div>
      </div>
      {editor && (
        <details className="quiet" style={{ marginTop: 18 }}>
          <summary>Store name</summary>
          <form action={updateStore} className="inline" style={{ marginTop: 8 }}>
            <input type="hidden" name="id" value={store.id} />
            <input type="text" name="name" defaultValue={store.name} placeholder="Full name" style={{ flex: 2, minWidth: 180 }} />
            <input type="text" name="short_name" defaultValue={store.short_name} placeholder="Tab name" style={{ flex: 1, minWidth: 120 }} />
            <input type="text" name="locations" defaultValue={store.locations.join(", ")} placeholder="Locations (comma separated)" style={{ flex: 1, minWidth: 140 }} />
            <button className="btn sm">Save</button>
          </form>
        </details>
      )}
    </div>
  );
}
