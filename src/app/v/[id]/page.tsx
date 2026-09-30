import Link from "next/link";
import { notFound } from "next/navigation";
import { isEditor } from "@/lib/auth";
import { getVisit, getStores, getInitiatives, getPeople, getTodos } from "@/lib/data";
import { fmtDate, relDay } from "@/lib/fmt";
import { updateVisit, deleteVisit, addTodo } from "@/app/actions";
import { VisitFields } from "@/components/VisitForm";
import { TodoList } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [visit, stores, initiatives, people, editor] = await Promise.all([getVisit(id), getStores(), getInitiatives(), getPeople(), isEditor()]);
  if (!visit) notFound();
  const store = stores.find((s) => s.id === visit.store_id)!;
  const inits = initiatives.filter((i) => visit.initiative_ids.includes(i.id));
  const folks = people.filter((p) => visit.people_ids.includes(p.id));
  const todos = await getTodos({ visitId: id, includeDone: true });

  return (
    <div style={{ ["--accent" as string]: store.accent }}>
      <div className="pagehead">
        <div>
          <div className="eyebrow"><Link href={`/s/${store.slug}`}>{store.name}</Link> · <Link href={`/s/${store.slug}/visits`}>visits</Link></div>
          <h1>{fmtDate(visit.date, { weekday: true })}</h1>
          {visit.focus && <div className="sub">{visit.focus}</div>}
        </div>
      </div>

      <div className="grid main-side">
        <div className="stack">
          <section className="card">
            <div className="cardhead"><h2>Recap</h2></div>
            {visit.summary ? <p className="pre">{visit.summary}</p> : <p className="empty">No recap written</p>}
            {(inits.length > 0 || folks.length > 0) && (
              <div className="chips" style={{ marginTop: 12 }}>
                {inits.map((i) => <Link key={i.id} href={`/i/${i.id}`} className="chip">{i.name}</Link>)}
                {folks.map((p) => <Link key={p.id} href={`/p/${p.id}`} className="chip" style={{ borderStyle: "dashed" }}>{p.name}</Link>)}
              </div>
            )}
            {visit.private_notes && (
              <details className="quiet">
                <summary>Trainer notes</summary>
                <p className="pre muted" style={{ marginTop: 8 }}>{visit.private_notes}</p>
              </details>
            )}
          </section>

          {editor && (
            <details className="adder">
              <summary>Edit this visit</summary>
              <form action={updateVisit} className="body">
                <input type="hidden" name="id" value={visit.id} />
                <VisitFields stores={stores} initiatives={initiatives} people={people} visit={visit} />
                <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                  <button className="btn" type="submit">Save changes</button>
                </div>
              </form>
              <form action={deleteVisit} style={{ paddingBottom: 14 }}>
                <input type="hidden" name="id" value={visit.id} />
                <input type="hidden" name="back" value={`/s/${store.slug}`} />
                <button className="btn sm danger" type="submit">Delete visit</button>
              </form>
            </details>
          )}
        </div>

        <div className="stack">
          <section className="card">
            <div className="cardhead"><h2>Next visit</h2></div>
            {visit.next_visit_date ? (
              <>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700 }}>{fmtDate(visit.next_visit_date, { weekday: true })}</div>
                <div className="faint small">{relDay(visit.next_visit_date)}</div>
                {visit.next_visit_plan && <p className="pre" style={{ marginTop: 8 }}>{visit.next_visit_plan}</p>}
              </>
            ) : <p className="empty">Not set</p>}
          </section>
          <section className="card">
            <div className="cardhead"><h2>Follow-ups</h2></div>
            <TodoList todos={todos} editor={editor} people={people} />
            {editor && (
              <form action={addTodo} className="inline" style={{ marginTop: 10 }}>
                <input type="hidden" name="store_id" value={store.id} />
                <input type="hidden" name="visit_id" value={visit.id} />
                <input type="text" name="text" placeholder="Add a follow-up" required style={{ flex: 1 }} />
                <button className="btn sm">Add</button>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
