import { isEditor } from "@/lib/auth";
import { getStores, getInitiatives, getAllRoster } from "@/lib/data";
import { InitiativeCard } from "@/components/ui";
import { addInitiative } from "@/app/actions";
import { today } from "@/lib/fmt";

export const dynamic = "force-dynamic";

export default async function Initiatives() {
  const [editor, stores, initiatives, roster] = await Promise.all([isEditor(), getStores(), getInitiatives(), getAllRoster()]);
  const live = initiatives.filter((i) => i.status !== "done");
  const done = initiatives.filter((i) => i.status === "done");
  return (
    <>
      <div className="pagehead"><div><div className="eyebrow">All stores</div><h1>Initiatives</h1></div></div>
      <div className="stack">
        {live.length ? (
          <div className="grid cols-3">{live.map((i) => <InitiativeCard key={i.id} init={i} roster={roster.filter((r) => r.initiative_id === i.id)} stores={stores} />)}</div>
        ) : <div className="card"><p className="empty">Nothing yet. Add the first initiative below.</p></div>}

        {editor && (
          <details className="adder" open={!live.length}>
            <summary>New initiative</summary>
            <form action={addInitiative} className="body">
              <div className="frow">
                <label className="f" style={{ gridColumn: "span 2" }}>Name<input type="text" name="name" placeholder="Offer a specific appointment time on every call" required /></label>
                <label className="f">Status
                  <select name="status" defaultValue="active"><option value="planning">Planning</option><option value="active">Active</option><option value="sustaining">Sustaining</option><option value="done">Done</option></select>
                </label>
                <label className="f">Start<input type="date" name="start_date" defaultValue={today()} /></label>
              </div>
              <div className="frow wide"><label className="f">Goal (one line)<input type="text" name="goal_text" placeholder="Every salesperson offers two specific times on every inbound call" /></label></div>
              <div className="frow wide"><label className="f">Description<textarea name="description" placeholder="What the behavior is, why it matters, how it's coached" /></label></div>
              <label className="f">Stores
                <div className="chips" style={{ marginTop: 4, marginBottom: 12 }}>
                  {stores.map((s) => <label key={s.id} className="chip"><input type="checkbox" name="store_ids" value={s.id} defaultChecked={!s.is_bdc} />{s.short_name}</label>)}
                </div>
              </label>
              <button className="btn gold">Create</button>
            </form>
          </details>
        )}

        {done.length > 0 && (
          <details className="quiet">
            <summary>Done ({done.length})</summary>
            <div className="grid cols-3" style={{ marginTop: 12 }}>{done.map((i) => <InitiativeCard key={i.id} init={i} roster={roster.filter((r) => r.initiative_id === i.id)} stores={stores} />)}</div>
          </details>
        )}
      </div>
    </>
  );
}
