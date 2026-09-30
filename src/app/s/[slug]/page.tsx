import Link from "next/link";
import { notFound } from "next/navigation";
import { isEditor, canPost, managerCodeRequired } from "@/lib/auth";
import { getStorePosts, getExamples, signExamples } from "@/lib/data";
import { ExampleGallery } from "@/components/ExampleGallery";
import { StoreNotes } from "@/components/StoreNotes";
import {
  getStores, getStoreBySlug, storeFamily, getInitiatives, getAllRoster, getVisits, getTodos,
  getWins, getPeople, getBookmarks, getCommitments, getGoals, getGoalEntries,
} from "@/lib/data";
import { fmtDate, relDay, today } from "@/lib/fmt";
import { InitiativeCard, TodoList, VisitList, WinList, CommitmentList, Sparkline } from "@/components/ui";
import { MonthPanel } from "@/components/MonthPanel";
import { addBookmark, deleteBookmark, addTodo, addWin, addCommitment, addGoal, addGoalEntry } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function StorePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ phase?: string; posted?: string; code?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const [store, stores, editor, poster] = await Promise.all([getStoreBySlug(slug), getStores(), isEditor(), canPost()]);
  if (!store) notFound();
  const family = storeFamily(store, stores);
  const ids = family.map((s) => s.id);

  const [initiatives, roster, visits, todos, wins, people, bookmarksAll, commitments, goals] = await Promise.all([
    getInitiatives(), getAllRoster(), getVisits({ storeIds: ids, limit: 6 }), getTodos({ storeIds: ids }),
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

  const next = visits.filter((v) => v.next_visit_date && v.next_visit_date >= today())
    .sort((a, b) => a.next_visit_date!.localeCompare(b.next_visit_date!))[0];
  const last = visits[0];

  const roleCounts = peopleHere.reduce<Record<string, number>>((m, p) => { m[p.role] = (m[p.role] || 0) + 1; return m; }, {});

  return (
    <div style={{ ["--accent" as string]: store.accent }}>
      <div className="pagehead">
        <div>
          <div className="accentbar" />
          <h1>{store.name}</h1>
          <div className="sub small">
            {store.locations.length > 0 && <span>Includes {store.locations.join(" and ")} · </span>}
            {family.filter((s) => s.id !== store.id).map((s) => <span key={s.id}>Shares {s.name} · </span>)}
            {peopleHere.length} people
            {Object.entries(roleCounts).map(([r, n]) => ` · ${n} ${n === 1 ? r : r === "Salesperson" ? "Salespeople" : r + "s"}`).join("")}
            {" · "}<Link href={`/people?store=${store.slug}`}>roster</Link>
          </div>
        </div>
        {editor && <Link href={`/visit/new?store=${store.slug}`} className="btn gold">Log a visit</Link>}
      </div>

      <MonthPanel store={store} family={family} allStores={stores} editor={editor} phaseOverride={sp.phase} basePath={`/s/${store.slug}`} />

      <section style={{ marginBottom: 20 }}>
        <div className="bookmarks">
          {bookmarks.map((b) => (
            <span key={b.id} style={{ display: "inline-flex", alignItems: "center" }}>
              <a className="bookmark" href={b.url} target="_blank" rel="noreferrer">
                <span className="k">{b.kind}</span>{b.title}{b.store_id === null && <span className="faint small">all</span>}
              </a>
              {editor && <form action={deleteBookmark}><input type="hidden" name="id" value={b.id} /><button className="iconbtn" title="Remove">×</button></form>}
            </span>
          ))}
          {editor && (
            <details className="adder" style={{ padding: "0 10px", borderRadius: 8 }}>
              <summary style={{ padding: "6px 0" }}>Bookmark</summary>
              <form action={addBookmark} className="body" style={{ paddingTop: 6 }}>
                <input type="hidden" name="store_id" value={store.id} />
                <div className="frow">
                  <input type="text" name="title" placeholder="Title (Appointment board)" required />
                  <input type="url" name="url" placeholder="https://" required />
                  <select name="kind"><option value="report">Report</option><option value="tool">Tool</option><option value="doc">Doc</option></select>
                  <button className="btn sm">Add</button>
                </div>
              </form>
            </details>
          )}
          {!bookmarks.length && !editor && <span className="faint small">No links yet</span>}
        </div>
      </section>

      <div className="grid main-side">
        <div className="stack">
          <section>
            <div className="cardhead"><h2>Initiatives here</h2>{editor && <Link className="more" href="/initiatives">Manage</Link>}</div>
            {storeInits.length ? (
              <div className="grid cols-2">
                {storeInits.map((i) => (
                  <InitiativeCard key={i.id} init={i} stores={stores}
                    roster={roster.filter((r) => r.initiative_id === i.id && peopleIds.has(r.person_id))} />
                ))}
              </div>
            ) : <div className="card"><p className="empty">No initiatives assigned to this store yet</p></div>}
          </section>

          {(examples.length > 0 || editor) && (
            <section className="card">
              <div className="cardhead"><h2>Recent examples</h2><Link className="more" href={`/examples?store=${store.slug}`}>{editor ? "Library and upload" : "All examples"}</Link></div>
              <ExampleGallery items={examples} people={people.map((p) => ({ id: p.id, name: p.name }))} initiatives={initiatives.map((i) => ({ id: i.id, name: i.name }))}
                stores={stores.map((s) => ({ id: s.id, name: s.short_name }))} editor={editor} emptyText="No screenshots from this store yet. Add them in the Examples library." />
            </section>
          )}

          <section className="card">
            <div className="cardhead"><h2>Visits</h2><Link className="more" href={`/s/${store.slug}/visits`}>All visits</Link></div>
            <VisitList visits={visits} stores={stores} showStore={family.length > 1} />
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
          <section className="card">
            <div className="cardhead"><h2>Next visit</h2></div>
            {next ? (
              <>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700 }}>{fmtDate(next.next_visit_date!, { weekday: true })}</div>
                <div className="faint small">{relDay(next.next_visit_date)}</div>
                {next.next_visit_plan && <p className="pre" style={{ marginTop: 8 }}>{next.next_visit_plan}</p>}
              </>
            ) : <p className="empty">Not scheduled. Set it on your next visit log.</p>}
            {last && <p className="faint small" style={{ marginTop: 10 }}>Last visit <Link href={`/v/${last.id}`}>{fmtDate(last.date)}</Link> ({relDay(last.date)})</p>}
          </section>

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
    </div>
  );
}
