import { isEditor } from "@/lib/auth";
import { getStores, getTodos, getPeople, getInitiatives } from "@/lib/data";
import { TodoList } from "@/components/ui";
import { addTodo } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Todos({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const sp = await searchParams;
  const [editor, stores, todos, people, initiatives] = await Promise.all([isEditor(), getStores(), getTodos({ includeDone: true }), getPeople(), getInitiatives()]);
  const open = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done).slice(0, 40);
  const general = open.filter((t) => !t.store_id);

  return (
    <>
      <div className="pagehead"><div><div className="eyebrow">Everything open</div><h1>To-dos</h1></div></div>
      <div className="stack">
        {editor && (
          <form action={addTodo} className="card inline">
            <input type="text" name="text" placeholder="New to-do" required style={{ flex: 2, minWidth: 200 }} />
            <select name="store_id" style={{ width: "auto" }}><option value="">General</option>{stores.map((s) => <option key={s.id} value={s.id}>{s.short_name}</option>)}</select>
            <select name="initiative_id" style={{ width: "auto" }}><option value="">No initiative</option>{initiatives.filter((i) => i.status !== "done").map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
            <input type="date" name="due" style={{ width: 140 }} />
            <button className="btn sm">Add</button>
          </form>
        )}
        <div className="grid cols-2">
          {general.length > 0 && (
            <section className="card"><div className="cardhead"><h2>General</h2></div><TodoList todos={general} editor={editor} people={people} /></section>
          )}
          {stores.map((s) => {
            const rows = open.filter((t) => t.store_id === s.id);
            if (!rows.length) return null;
            return (
              <section key={s.id} className="card" style={{ ["--accent" as string]: s.accent }}>
                <div className="cardhead"><h2 style={{ color: s.accent }}>{s.short_name}</h2><span className="faint small">{rows.length}</span></div>
                <TodoList todos={rows} editor={editor} people={people} />
              </section>
            );
          })}
          {!open.length && <div className="card"><p className="empty">Nothing open. Nice.</p></div>}
        </div>
        {done.length > 0 && (
          <details className="quiet" open={Boolean(sp.done)}>
            <summary>Done recently ({done.length})</summary>
            <div className="card" style={{ marginTop: 10 }}><TodoList todos={done} editor={editor} people={people} stores={stores} showStore /></div>
          </details>
        )}
      </div>
    </>
  );
}
