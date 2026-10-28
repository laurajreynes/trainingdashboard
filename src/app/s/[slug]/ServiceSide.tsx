import Link from "next/link";
import type { Bookmark, Initiative, InitiativePerson, Person, Store, Visit, Win } from "@/lib/types";
import { getGoals, getGoalEntries, getResources } from "@/lib/data";
import { isServiceInit, isServicePerson, isServiceVisit } from "@/lib/service";
import { fmtDate, today, weeksBack } from "@/lib/fmt";
import { StoreFocus } from "@/components/StoreFocus";
import { InitiativeCard } from "@/components/InitiativeCard";
import { TextResource } from "@/components/TextResource";
import { CarWarsBanner } from "@/components/CarWars";
import { VisitList, WinList } from "@/components/ui";
import { splitTime } from "@/components/WeekCalendar";
import { addGoalEntries, addWin } from "@/app/actions";

type Note = { key: string; body: string | null };

/** The service department's half of a store page: advisors, the service initiative, its activity, its visits. */
export async function ServiceSide({ store, stores, editor, initiatives, roster, visits, wins, people, groupNotes, carwars, stages, areas, bookmarks }: {
  store: Store; stores: Store[]; editor: boolean; initiatives: Initiative[]; roster: InitiativePerson[]; visits: Visit[]; wins: Win[];
  people: Person[]; groupNotes: Note[]; carwars: Initiative | undefined; stages: Record<string, string>; areas: Record<string, string>; bookmarks: Bookmark[];
}) {
  const svcPeople = people.filter((p) => p.active && p.store_id === store.id && isServicePerson(p));
  const svcIds = new Set(svcPeople.map((p) => p.id));
  const svcInits = initiatives.filter((i) => i.store_ids.includes(store.id) && i.status !== "done" && isServiceInit(i));
  const svcVisits = visits.filter((v) => v.store_id === store.id && isServiceVisit(v));
  const upcoming = svcVisits.filter((v) => v.date >= today()).sort((a, b) => a.date.localeCompare(b.date) || splitTime(a.focus).minutes - splitTime(b.focus).minutes).slice(0, 6);
  const logged = svcVisits.filter((v) => v.date <= today());
  const focus = groupNotes.find((n) => n.key === `focus:${store.id}:service`)?.body || null;
  const setup = groupNotes.find((n) => n.key === `cwsetup:${store.slug}-service`)?.body || null;

  // Activity: count goals on the service initiatives (calls, conversations, yeses), this week and this month
  const goals = (await Promise.all(svcInits.map((i) => getGoals({ initiativeId: i.id })))).flat().filter((g) => g.kind === "count");
  const entries = await getGoalEntries(goals.map((g) => g.id));
  const weekStart = weeksBack(1)[0];
  const monthStart = `${today().slice(0, 8)}01`;
  const sum = (gid: string, from: string) => entries.filter((e) => e.goal_id === gid && e.date >= from).reduce((a, e) => a + Number(e.value), 0);
  const recent = [...new Set(entries.map((e) => e.date))].sort().reverse().slice(0, 5);

  const resourceLists = await Promise.all(svcInits.map((i) => getResources(i.id)));
  const resources = svcInits.flatMap((i, k) => resourceLists[k].map((r) => ({ ...r, initName: i.name })));
  const files = bookmarks.filter((b) => b.kind === "doc" && b.initiative_id && svcInits.some((i) => i.id === b.initiative_id));
  const svcWins = wins.filter((w) => (w.initiative_id && svcInits.some((i) => i.id === w.initiative_id)) || (w.person_id && svcIds.has(w.person_id)));
  const trim = (t: string) => t.replace(new RegExp(`^${store.short_name}\\s+service\\s*[:,-]?\\s*`, "i"), "").replace(/,?\s*until .*$/i, "") || "Service";

  return (
    <>
      <div data-keep><section className="card nextstrip">
        <div className="cardhead"><h2>Next training visit</h2>{editor && <Link className="more" href={`/visit/new?store=${store.slug}&plan=1`}>Schedule</Link>}</div>
        {upcoming.length ? (
          <div className="nextrow">
            {upcoming.map((v) => {
              const { time, text } = splitTime(v.focus);
              const isToday = v.date === today();
              return (
                <div key={v.id} className={`nextitem${isToday ? " today" : ""}`}>
                  <Link href={`/v/${v.id}`} className="stretch" aria-label="Open visit" />
                  <span className="when">{isToday ? "Today" : fmtDate(v.date, { weekday: true })}{time ? ` · ${time}` : ""}</span>
                  <span className="what">{trim(text || v.focus || "")}</span>
                </div>
              );
            })}
          </div>
        ) : <p className="empty">Nothing scheduled</p>}
      </section></div>

      <div data-keep style={{ marginTop: 12 }}><StoreFocus storeId={`${store.id}:service`} body={focus} editor={editor} /></div>

      <div className="flow topband two">
        <section className="card">
          <div className="cardhead"><h2>Initiatives here</h2>{editor && <Link className="more" href="/initiatives">Manage</Link>}</div>
          {svcInits.length ? (
            <div className="initstack">
              {svcInits.map((i) => <InitiativeCard key={i.id} init={i} stores={stores} stage={stages[i.id]} area={areas[i.id]} hideStore={store.slug} roster={roster.filter((r) => r.initiative_id === i.id && svcIds.has(r.person_id))} />)}
            </div>
          ) : <p className="empty">No service initiative yet</p>}
        </section>
        <div className="stack">
          <section className="card svcactivity">
            <div className="cardhead"><h2>Advisor activity</h2><span className="small muted">This week · {new Date(today() + "T12:00:00").toLocaleDateString("en-US", { month: "long" })}</span></div>
            {goals.length ? (
              <div className="svctiles">
                {goals.map((g) => {
                  const yes = /yes/i.test(g.name);
                  return (
                    <div key={g.id} className={`svctile${yes ? " yes" : ""}`}>
                      <div className="svcnum">{sum(g.id, weekStart)}</div>
                      <div className="svclabel">{g.name}</div>
                      <div className="faint small">{sum(g.id, monthStart)} this month</div>
                    </div>
                  );
                })}
              </div>
            ) : <p className="empty">Add count goals to the service initiative (calls, conversations, yeses) and they show here.</p>}
            {recent.length > 0 && (
              <details className="quiet" style={{ marginTop: 8 }}>
                <summary className="small">By day</summary>
                <table className="tbl" style={{ marginTop: 6 }}>
                  <thead><tr><th></th>{goals.map((g) => <th key={g.id}>{g.name}</th>)}</tr></thead>
                  <tbody>{recent.map((d) => <tr key={d}><td>{fmtDate(d, { weekday: true })}</td>{goals.map((g) => <td key={g.id}>{entries.filter((e) => e.goal_id === g.id && e.date === d).reduce((a, e) => a + Number(e.value), 0) || ""}</td>)}</tr>)}</tbody>
                </table>
              </details>
            )}
            {editor && goals.length > 0 && (
              <form action={addGoalEntries} className="inline svclog" style={{ marginTop: 10 }}>
                <input type="date" name="date" defaultValue={today()} style={{ width: 140 }} />
                {goals.map((g) => <label key={g.id} className="small"><span className="faint">{g.name}</span><input type="text" inputMode="numeric" name={`v_${g.id}`} style={{ width: 64 }} /></label>)}
                <button className="btn sm">Log</button>
              </form>
            )}
          </section>
          {(resources.length > 0 || files.length > 0) && (
            <section className="card">
              <div className="cardhead"><h2>Resources</h2></div>
              <div className="grid-chips rsrc">
                {files.map((b) => <a key={b.id} className="chipr" href={b.url} target="_blank" rel="noreferrer"><span className="t">{b.title}</span></a>)}
                {resources.map((r) => r.url
                  ? <a key={r.id} className="chipr" href={r.url} target="_blank" rel="noreferrer">{r.kind !== "doc" && <span className="k">{r.kind.replace("_", " ")}</span>}<span className="t">{r.title}</span></a>
                  : <TextResource key={r.id} kind={r.kind.replace("_", " ")} title={r.title} body={r.body} initName={r.initName} />)}
              </div>
            </section>
          )}
        </div>
      </div>

      <div className="flow" style={{ marginTop: 18 }}>
        <div className="stack">
          <section className="card">
            <div className="cardhead"><h2>Wins</h2></div>
            {svcWins.length ? <WinList wins={svcWins.slice(0, 6)} editor={editor} people={people} /> : <p className="empty">The first yes goes here</p>}
            {editor && (
              <form action={addWin} style={{ marginTop: 10 }}>
                <input type="hidden" name="store_id" value={store.id} />
                <div className="frow wide"><input type="text" name="text" placeholder="What happened" required /></div>
                <div className="frow">
                  <select name="person_id"><option value="">Who (optional)</option>{svcPeople.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                  <select name="initiative_id"><option value="">Initiative (optional)</option>{svcInits.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
                </div>
                <button className="btn sm">Log win</button>
              </form>
            )}
          </section>
        </div>
        <div className="stack">
          <section className="card">
            <div className="cardhead"><h2>Visits</h2></div>
            {logged.length ? <VisitList visits={logged.slice(0, 6)} stores={stores} people={people} /> : <p className="empty">No service visits logged yet</p>}
          </section>
        </div>
        <div className="stack">
          <section className="card">
            <div className="cardhead"><h2>Service team</h2><span className="small muted">{svcPeople.length}</span></div>
            {svcPeople.length ? (
              <ul className="list">
                {svcPeople.sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name)).map((p) => (
                  <li key={p.id}><div className="grow"><Link href={`/p/${p.id}`}>{p.name}</Link></div><span className="faint small">{p.role}</span></li>
                ))}
              </ul>
            ) : <p className="empty">Add advisors with location &quot;Service&quot; on the People page</p>}
          </section>
        </div>
      </div>

      {carwars && (
        <div data-keep style={{ marginTop: 18 }}>
          <CarWarsBanner init={carwars} roster={roster} stores={stores} store={store} location="Service" peopleIds={svcIds} launches={groupNotes.find((n) => n.key === "carwars")?.body || null} setup={setup} editor={editor} />
        </div>
      )}
    </>
  );
}
