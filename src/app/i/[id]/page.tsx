import Link from "next/link";
import { FileUploader } from "@/components/FileUploader";
import { notFound } from "next/navigation";
import { isEditor } from "@/lib/auth";
import {
  getInitiative, getStores, getPeople, getRoster, getResources, getGoals, getGoalEntries, getVisits, getTodos, getWins, getBookmarks,
  getExamples, getExampleThemes, signExamples,
} from "@/lib/data";
import { ExampleGallery } from "@/components/ExampleGallery";
import { HBars } from "@/components/charts";
import { ExampleUploader } from "@/components/ExampleUploader";
import { ROSTER_LABEL, type RosterStatus } from "@/lib/types";
import { fmtDate, today, storeAccent } from "@/lib/fmt";
import { StatusTag, RosterBar, TodoList, VisitList, WinList, Sparkline } from "@/components/ui";
import {
  updateInitiative, deleteInitiative, setRosterStatus, addPeopleToInitiative, removeFromInitiative,
  addResource, deleteResource, addGoal, addGoalEntry, deleteGoal, addTodo, addBookmark, deleteBookmark,
} from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function InitiativePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ store?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const [init, stores, editor] = await Promise.all([getInitiative(id), getStores(), isEditor()]);
  if (!init) notFound();
  const [people, roster, resources, goals, visitsAll, todos, wins, bookmarksAll] = await Promise.all([
    getPeople(), getRoster(id), getResources(id), getGoals({ initiativeId: id }), getVisits({ limit: 300 }), getTodos({ initiativeId: id }), getWins({ initiativeId: id, limit: 8 }), getBookmarks(),
  ]);
  const entries = await getGoalEntries(goals.map((g) => g.id));
  const visits = visitsAll.filter((v) => v.initiative_ids.includes(id)).slice(0, 8);
  const bookmarks = bookmarksAll.filter((b) => b.initiative_id === id);
  const [exRows, themes] = await Promise.all([getExamples({ initiativeId: id, limit: 120 }), getExampleThemes()]);
  const examples = await signExamples(exRows);
  const exOpts = {
    people: people.filter((p) => p.active).map((p) => ({ id: p.id, name: p.name, sub: stores.find((s) => s.id === p.store_id)?.short_name })),
    allPeople: people.map((p) => ({ id: p.id, name: p.name })),
    initiatives: [{ id: init.id, name: init.name }],
    stores: stores.map((s) => ({ id: s.id, name: s.short_name })),
  };

  const initStores = stores.filter((s) => init.store_ids.includes(s.id));
  const filterStore = stores.find((s) => s.slug === sp.store);
  const rosterByPerson = new Map(roster.map((r) => [r.person_id, r]));
  const onRoster = people.filter((p) => rosterByPerson.has(p.id));
  const candidates = people.filter((p) => p.active && !rosterByPerson.has(p.id) && (init.store_ids.length === 0 || init.store_ids.includes(p.store_id)));

  const storeBars = stores.filter((s) => init.store_ids.includes(s.id)).map((s) => {
    const ros = roster.filter((r) => people.find((p) => p.id === r.person_id)?.store_id === s.id);
    const done = ros.filter((r) => r.status === "trained" || r.status === "solid").length;
    return { label: s.short_name, value: ros.length ? Math.round((done / ros.length) * 100) : 0, color: storeAccent(s), sub: ros.length ? `${done}/${ros.length}` : "no roster", href: `/i/${id}?store=${s.slug}`, max: 100 };
  });
  const groups = (filterStore ? [filterStore] : stores).map((s) => ({
    store: s,
    rows: onRoster.filter((p) => p.store_id === s.id).sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((g) => g.rows.length);

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow"><Link href="/initiatives">Initiatives</Link>{initStores.length ? ` · ${initStores.map((s) => s.short_name).join(", ")}` : ""}</div>
          <h1>{init.name} <StatusTag status={init.status} /></h1>
          {init.goal_text && <div className="sub">{init.goal_text}</div>}
        </div>
      </div>

      <div className="grid main-side">
        <div className="stack">
          {init.description && <details className="card quiet about"><summary>About this initiative</summary><p className="pre" style={{ marginTop: 8 }}>{init.description}</p></details>}

          {storeBars.length > 1 && (
            <section className="card">
              <div className="cardhead"><h2>Trained by store</h2><span className="faint small">% of roster</span></div>
              <HBars rows={storeBars} unit="%" max={100} />
            </section>
          )}

          <section className="card">
            <div className="cardhead">
              <h2>Who&apos;s been trained</h2>
              <div className="small" style={{ display: "flex", gap: 8 }}>
                <Link href={`/i/${id}`} className={!filterStore ? "" : "faint"}>All</Link>
                {initStores.map((s) => <Link key={s.id} href={`/i/${id}?store=${s.slug}`} className={filterStore?.id === s.id ? "" : "faint"}>{s.short_name}</Link>)}
              </div>
            </div>
            <RosterBar roster={filterStore ? roster.filter((r) => onRoster.find((p) => p.id === r.person_id)?.store_id === filterStore.id) : roster} showLegend />
            {groups.map(({ store, rows }) => (
              <div key={store.id} style={{ marginTop: 16 }}>
                <div className="eyebrow" style={{ color: storeAccent(store), marginBottom: 4 }}>{store.name}</div>
                <table className="tbl">
                  <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Trained</th><th>Note</th>{editor && <th />}</tr></thead>
                  <tbody>
                    {rows.map((p) => {
                      const r = rosterByPerson.get(p.id)!;
                      const cls = r.status === "solid" ? "good" : r.status === "trained" ? "gold" : r.status === "needs_followup" ? "warn" : "";
                      return (
                        <tr key={p.id}>
                          <td><Link href={`/p/${p.id}`} style={{ fontWeight: 600 }}>{p.name}</Link>{p.location ? <span className="faint small"> · {p.location}</span> : null}</td>
                          <td className="muted small">{p.role}</td>
                          {editor ? (
                            <td colSpan={3}>
                              <form action={setRosterStatus} className="inline" key={`${r.status}|${r.trained_on}|${r.notes}`}>
                                <input type="hidden" name="initiative_id" value={id} />
                                <input type="hidden" name="person_id" value={p.id} />
                                <select name="status" defaultValue={r.status} style={{ width: "auto", padding: "3px 6px", fontSize: 13 }}>
                                  {(Object.keys(ROSTER_LABEL) as RosterStatus[]).map((k) => <option key={k} value={k}>{ROSTER_LABEL[k]}</option>)}
                                </select>
                                <input type="date" name="trained_on" defaultValue={r.trained_on || ""} style={{ width: 140, padding: "3px 6px", fontSize: 13 }} />
                                <input type="text" name="notes" defaultValue={r.notes || ""} placeholder="note" style={{ flex: 1, minWidth: 120, padding: "3px 6px", fontSize: 13 }} />
                                <button className="btn sm ghost">Save</button>
                              </form>
                            </td>
                          ) : (
                            <>
                              <td><span className={`tag ${cls}`}>{ROSTER_LABEL[r.status]}</span></td>
                              <td className="muted small">{r.trained_on ? fmtDate(r.trained_on) : ""}</td>
                              <td className="muted small">{r.notes || ""}</td>
                            </>
                          )}
                          {editor && <td><form action={removeFromInitiative}><input type="hidden" name="id" value={r.id} /><button className="iconbtn" title="Remove from roster">×</button></form></td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
            {!onRoster.length && <p className="empty">No one on the roster yet</p>}
            {editor && candidates.length > 0 && (
              <details className="adder" style={{ marginTop: 14 }}>
                <summary>Add people to this initiative</summary>
                <form action={addPeopleToInitiative} className="body">
                  <input type="hidden" name="initiative_id" value={id} />
                  {stores.filter((s) => candidates.some((p) => p.store_id === s.id)).map((s) => (
                    <div key={s.id} style={{ marginBottom: 10 }}>
                      <div className="eyebrow" style={{ marginBottom: 4 }}>{s.short_name}</div>
                      <div className="chips">
                        {candidates.filter((p) => p.store_id === s.id).map((p) => (
                          <label key={p.id} className="chip"><input type="checkbox" name="person_ids" value={p.id} />{p.name}</label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button className="btn sm">Add selected</button>
                </form>
              </details>
            )}
          </section>

          <section className="card">
            <div className="cardhead"><h2>Resources</h2></div>
            {resources.length ? (
              <ul className="list">
                {resources.map((r) => (
                  <li key={r.id}>
                    <span className="tag" style={{ marginTop: 2 }}>{r.kind.replace("_", " ")}</span>
                    <div className="grow">
                      {r.url ? <a href={r.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>{r.title}</a> : <strong>{r.title}</strong>}
                      {r.body && <details className="quiet" style={{ borderTop: 0, marginTop: 4, paddingTop: 0 }}><summary>Show</summary><p className="pre muted small" style={{ marginTop: 6 }}>{r.body}</p></details>}
                    </div>
                    {editor && <form action={deleteResource}><input type="hidden" name="id" value={r.id} /><button className="iconbtn">×</button></form>}
                  </li>
                ))}
              </ul>
            ) : <p className="empty">No scripts, word tracks, or links yet</p>}
            {editor && (
              <details className="adder" style={{ marginTop: 12 }}>
                <summary>Resource</summary>
                <form action={addResource} className="body">
                  <input type="hidden" name="initiative_id" value={id} />
                  <div className="frow">
                    <input type="text" name="title" placeholder="Title" required style={{ gridColumn: "span 2" }} />
                    <select name="kind"><option value="word_track">Word track</option><option value="script">Script</option><option value="video">Video</option><option value="doc">Doc</option><option value="link">Link</option></select>
                    <input type="url" name="url" placeholder="https:// (optional)" />
                  </div>
                  <div className="frow wide"><textarea name="body" placeholder="Paste the word track or notes here (optional)" /></div>
                  <button className="btn sm">Add</button>
                </form>
              </details>
            )}
          </section>

          <section className="card">
            <div className="cardhead">
              <h2>Examples · {examples.length}</h2>
              {examples.length > 0 && <Link className="more" href={`/examples?initiative=${id}`}>Open in library</Link>}
            </div>
            <ExampleGallery items={examples} people={exOpts.allPeople} initiatives={exOpts.initiatives} stores={exOpts.stores} themes={themes} editor={editor}
              emptyText="No screenshots tied to this initiative yet" />
            {editor && (
              <details className="adder" style={{ marginTop: 12 }}>
                <summary>Add screenshots</summary>
                <div className="body">
                  <ExampleUploader compact people={exOpts.people} initiatives={exOpts.initiatives} stores={exOpts.stores} themes={themes} defaults={{ initiativeId: id, theme: init.name }} />
                </div>
              </details>
            )}
          </section>

          <section className="card">
            <div className="cardhead"><h2>Visits that covered this</h2></div>
            <VisitList visits={visits} stores={stores} showStore />
          </section>

          {editor && (
            <details className="adder">
              <summary>Edit initiative</summary>
              <form action={updateInitiative} className="body">
                <input type="hidden" name="id" value={id} />
                <div className="frow">
                  <label className="f" style={{ gridColumn: "span 2" }}>Name<input type="text" name="name" defaultValue={init.name} required /></label>
                  <label className="f">Status
                    <select name="status" defaultValue={init.status}><option value="planning">Planning</option><option value="active">Active</option><option value="sustaining">Sustaining</option><option value="done">Done</option></select>
                  </label>
                  <label className="f">Start<input type="date" name="start_date" defaultValue={init.start_date || ""} /></label>
                </div>
                <div className="frow wide"><label className="f">Goal<input type="text" name="goal_text" defaultValue={init.goal_text || ""} /></label></div>
                <div className="frow wide"><label className="f">Description<textarea name="description" defaultValue={init.description || ""} /></label></div>
                <div className="chips" style={{ marginBottom: 12 }}>
                  {stores.map((s) => <label key={s.id} className="chip"><input type="checkbox" name="store_ids" value={s.id} defaultChecked={init.store_ids.includes(s.id)} />{s.short_name}</label>)}
                </div>
                <button className="btn">Save</button>
              </form>
              <form action={deleteInitiative} style={{ paddingBottom: 14 }}>
                <input type="hidden" name="id" value={id} />
                <button className="btn sm danger">Delete initiative</button>
              </form>
            </details>
          )}
        </div>

        <div className="stack">
          {(bookmarks.length > 0 || editor) && (
            <section className="card">
              <div className="cardhead"><h2>Reports and links</h2></div>
              <div className="bookmarks">
                {bookmarks.map((b) => (
                  <span key={b.id} style={{ display: "inline-flex", alignItems: "center" }}>
                    <a className="bookmark" href={b.url} target="_blank" rel="noreferrer"><span className="k">{b.kind}</span>{b.title}</a>
                    {editor && <form action={deleteBookmark}><input type="hidden" name="id" value={b.id} /><button className="iconbtn">×</button></form>}
                  </span>
                ))}
              </div>
              {editor && (
                <form action={addBookmark} className="inline" style={{ marginTop: 10 }}>
                  <input type="hidden" name="initiative_id" value={id} />
                  <input type="text" name="title" placeholder="Title" required style={{ flex: 1, minWidth: 100 }} />
                  <input type="url" name="url" placeholder="https://" required style={{ flex: 2, minWidth: 140 }} />
                  <button className="btn sm">Add</button>
                </form>
              )}
              {editor && (
                <details className="quiet" style={{ marginTop: 8 }}>
                  <summary>Upload a PDF or spreadsheet</summary>
                  <div style={{ marginTop: 8 }}><FileUploader initiativeId={id} /></div>
                </details>
              )}
            </section>
          )}

          <section className="card">
            <div className="cardhead"><h2>Goals</h2></div>
            {goals.length ? goals.map((g) => (
              <div key={g.id} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>{g.name}</strong>
                  {editor && <form action={deleteGoal}><input type="hidden" name="id" value={g.id} /><button className="iconbtn">×</button></form>}
                </div>
                <Sparkline goal={g} entries={entries} />
                {editor && (
                  <form action={addGoalEntry} className="inline" style={{ marginTop: 6 }}>
                    <input type="hidden" name="goal_id" value={g.id} />
                    <input type="date" name="date" defaultValue={today()} style={{ width: 140 }} />
                    <input type="number" step="any" name="value" placeholder={g.unit} required style={{ width: 80 }} />
                    <button className="btn sm ghost">Log</button>
                  </form>
                )}
              </div>
            )) : <p className="empty">No measurable goal yet</p>}
            {editor && (
              <details className="adder" style={{ marginTop: 8 }}>
                <summary>Goal</summary>
                <form action={addGoal} className="body">
                  <input type="hidden" name="initiative_id" value={id} />
                  <div className="frow wide"><input type="text" name="name" placeholder="Appointment offer rate" required /></div>
                  <div className="frow">
                    <input type="number" step="any" name="target" placeholder="Target" />
                    <input type="text" name="unit" defaultValue="%" />
                    <select name="direction"><option value="up">Higher is better</option><option value="down">Lower is better</option></select>
                      <select name="kind"><option value="rate">Rate (%, per call)</option><option value="count">Count this month (appts, units)</option></select>
                  </div>
                  <button className="btn sm">Add goal</button>
                </form>
              </details>
            )}
          </section>

          <section className="card">
            <div className="cardhead"><h2>To-dos</h2></div>
            <TodoList todos={todos} editor={editor} people={people} stores={stores} showStore />
            {editor && (
              <form action={addTodo} className="inline" style={{ marginTop: 10 }}>
                <input type="hidden" name="initiative_id" value={id} />
                <input type="text" name="text" placeholder="Add a to-do" required style={{ flex: 1, minWidth: 140 }} />
                <select name="store_id" style={{ width: "auto" }}><option value="">Any store</option>{initStores.map((s) => <option key={s.id} value={s.id}>{s.short_name}</option>)}</select>
                <button className="btn sm">Add</button>
              </form>
            )}
          </section>

          <section className="card">
            <div className="cardhead"><h2>Wins</h2></div>
            <WinList wins={wins} editor={editor} people={people} stores={stores} showStore />
          </section>
        </div>
      </div>
    </>
  );
}
