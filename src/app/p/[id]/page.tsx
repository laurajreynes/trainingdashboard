import Link from "next/link";
import { notFound } from "next/navigation";
import { isEditor } from "@/lib/auth";
import { getPerson, getStores, getInitiatives, getRoster, getVisits, getTodos, getWins, getExamples, getExampleThemes, signExamples, getPeople } from "@/lib/data";
import { ExampleGallery } from "@/components/ExampleGallery";
import { ExampleUploader } from "@/components/ExampleUploader";
import { ROLES, ROSTER_LABEL, ROSTER_STATUSES, type RosterStatus } from "@/lib/types";
import { fmtDate, storeAccent } from "@/lib/fmt";
import { TodoList, VisitList, WinList } from "@/components/ui";
import { updatePerson, deletePerson, setRosterStatus, addTodo, addWin } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [person, stores, initiatives, roster, editor] = await Promise.all([getPerson(id), getStores(), getInitiatives(), getRoster(undefined, id), isEditor()]);
  if (!person) notFound();
  const store = stores.find((s) => s.id === person.store_id)!;
  const [visitsAll, todos, wins] = await Promise.all([getVisits({ limit: 300 }), getTodos({ personId: id, includeDone: true }), getWins({ personId: id })]);
  const visits = visitsAll.filter((v) => v.people_ids.includes(id));
  const [exRows, themes, allPeople] = await Promise.all([getExamples({ personId: id, limit: 120 }), getExampleThemes(), getPeople()]);
  const examples = await signExamples(exRows);
  const exOpts = {
    people: allPeople.map((p) => ({ id: p.id, name: p.name, sub: stores.find((s) => s.id === p.store_id)?.short_name })),
    initiatives: initiatives.filter((i) => i.status !== "done").map((i) => ({ id: i.id, name: i.name })),
    stores: stores.map((s) => ({ id: s.id, name: s.short_name })),
  };
  const rosterRows = initiatives.filter((i) => roster.some((r) => r.initiative_id === i.id));

  return (
    <div style={{ ["--accent" as string]: storeAccent(store) }}>
      <div className="pagehead">
        <div>
          <div className="eyebrow"><Link href={`/s/${store.slug}`}>{store.name}</Link>{person.location ? ` · ${person.location}` : ""}</div>
          <h1>{person.name}{!person.active && <span className="tag" style={{ marginLeft: 10, verticalAlign: "middle" }}>Inactive</span>}</h1>
          <div className="sub">{person.role}</div>
        </div>
      </div>

      <div className="grid main-side">
        <div className="stack">
          <section className="card">
            <div className="cardhead"><h2>Training status</h2></div>
            {rosterRows.length ? (
              <table className="tbl">
                <thead><tr><th>Initiative</th><th>Status</th><th>Trained</th><th>Note</th></tr></thead>
                <tbody>
                  {rosterRows.map((i) => {
                    const r = roster.find((x) => x.initiative_id === i.id)!;
                    const cls = r.status === "trained" || r.status === "solid" ? "good" : r.status === "needs_followup" ? "warn" : "";
                    return (
                      <tr key={i.id}>
                        <td><Link href={`/i/${i.id}`} style={{ fontWeight: 600 }}>{i.name}</Link></td>
                        {editor ? (
                          <td colSpan={3}>
                            <form action={setRosterStatus} className="inline" key={`${r.status}|${r.trained_on}|${r.notes}`}>
                              <input type="hidden" name="initiative_id" value={i.id} />
                              <input type="hidden" name="person_id" value={id} />
                              <select name="status" defaultValue={r.status} style={{ width: "auto", padding: "3px 6px", fontSize: 13 }}>
                                {ROSTER_STATUSES.map((k) => <option key={k} value={k}>{ROSTER_LABEL[k]}</option>)}
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : <p className="empty">Not on any initiative roster yet. Add them from an initiative page.</p>}
          </section>

          <section className="card">
            <div className="cardhead">
              <h2>Examples · {examples.length}</h2>
              {examples.length > 0 && <Link className="more" href={`/examples?person=${id}`}>Open in library</Link>}
            </div>
            <ExampleGallery items={examples} people={exOpts.people} initiatives={exOpts.initiatives} stores={exOpts.stores} themes={themes} editor={editor}
              emptyText="No screenshots for this person yet" />
            {editor && (
              <details className="adder" style={{ marginTop: 12 }}>
                <summary>Add screenshots of {person.name.split(" ")[0]}</summary>
                <div className="body">
                  <ExampleUploader compact people={exOpts.people} initiatives={exOpts.initiatives} stores={exOpts.stores} themes={themes} defaults={{ personIds: [id], storeId: person.store_id }} />
                </div>
              </details>
            )}
          </section>

          <section className="card">
            <div className="cardhead"><h2>Visits together</h2></div>
            <VisitList visits={visits} stores={stores} />
          </section>

          {(person.notes || editor) && (
            <details className={person.notes ? "card" : "adder"} open={false}>
              <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--ink-dim)", fontSize: 13, padding: person.notes ? 0 : "10px 0" }}>Trainer notes{editor ? " and details" : ""}</summary>
              {person.notes && !editor && <p className="pre muted" style={{ marginTop: 10 }}>{person.notes}</p>}
              {editor && (
                <form action={updatePerson} style={{ marginTop: 12 }} className="body">
                  <input type="hidden" name="id" value={id} />
                  <div className="frow">
                    <label className="f">Name<input type="text" name="name" defaultValue={person.name} required /></label>
                    <label className="f">Role<select name="role" defaultValue={person.role}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></label>
                    <label className="f">Store<select name="store_id" defaultValue={person.store_id}>{stores.map((s) => <option key={s.id} value={s.id}>{s.short_name}</option>)}</select></label>
                    <label className="f">Location<input type="text" name="location" defaultValue={person.location || ""} placeholder="Danhof" /></label>
                  </div>
                  <div className="frow wide"><label className="f">Notes<textarea name="notes" defaultValue={person.notes || ""} placeholder="Strengths, what to work on, how they take coaching" /></label></div>
                  <label className="chip" style={{ marginBottom: 12 }}><input type="checkbox" name="active" defaultChecked={person.active} />Active</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button className="btn">Save</button>
                  </div>
                </form>
              )}
              {editor && (
                <form action={deletePerson} style={{ marginTop: 8, paddingBottom: 12 }}>
                  <input type="hidden" name="id" value={id} />
                  <button className="btn sm danger">Delete person</button>
                </form>
              )}
            </details>
          )}
        </div>

        <div className="stack">
          <section className="card">
            <div className="cardhead"><h2>To-dos</h2></div>
            <TodoList todos={todos} editor={editor} />
            {editor && (
              <form action={addTodo} className="inline" style={{ marginTop: 10 }}>
                <input type="hidden" name="person_id" value={id} />
                <input type="hidden" name="store_id" value={store.id} />
                <input type="text" name="text" placeholder="Follow up on…" required style={{ flex: 1 }} />
                <button className="btn sm">Add</button>
              </form>
            )}
          </section>
          <section className="card">
            <div className="cardhead"><h2>Wins</h2></div>
            <WinList wins={wins} editor={editor} />
            {editor && (
              <form action={addWin} className="inline" style={{ marginTop: 10 }}>
                <input type="hidden" name="person_id" value={id} />
                <input type="hidden" name="store_id" value={store.id} />
                <input type="text" name="text" placeholder="Set 3 appointments off the phone today" required style={{ flex: 1 }} />
                <button className="btn sm">Log</button>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
