import type { Initiative, Person, Store, Visit } from "@/lib/types";
import { today } from "@/lib/fmt";

export function VisitFields({ stores, initiatives, people, visit, defaultStoreId }: {
  stores: Store[]; initiatives: Initiative[]; people: Person[]; visit?: Visit; defaultStoreId?: string;
}) {
  const storeId = visit?.store_id || defaultStoreId || stores[0]?.id;
  return (
    <>
      <div className="frow">
        <label className="f">Store
          <select name="store_id" defaultValue={storeId} required>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="f">Date<input type="date" name="date" defaultValue={visit?.date || today()} /></label>
        <label className="f" style={{ gridColumn: "span 2" }}>Focus (one line)<input type="text" name="focus" defaultValue={visit?.focus || ""} placeholder="Appointment offers with the BDC, role play on the floor" /></label>
      </div>
      <div className="frow wide">
        <label className="f">Recap (shareable)
          <textarea name="summary" defaultValue={visit?.summary || ""} placeholder="What we worked on, what landed, what the store should keep doing" style={{ minHeight: 110 }} />
        </label>
      </div>
      <div className="frow wide">
        <label className="f">Trainer notes (shown one click deeper)
          <textarea name="private_notes" defaultValue={visit?.private_notes || ""} placeholder="Observations, who's struggling, what to watch next time" />
        </label>
      </div>
      <div className="frow cols-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <label className="f">Initiatives covered
          <div className="chips" style={{ marginTop: 4 }}>
            {initiatives.filter((i) => i.status !== "done").map((i) => (
              <label key={i.id} className="chip"><input type="checkbox" name="initiative_ids" value={i.id} defaultChecked={visit?.initiative_ids.includes(i.id)} />{i.name}</label>
            ))}
            {!initiatives.length && <span className="faint small">None yet</span>}
          </div>
        </label>
        <label className="f">People worked with
          <div className="chips" style={{ marginTop: 4, maxHeight: 180, overflowY: "auto" }}>
            {people.filter((p) => p.active).map((p) => (
              <label key={p.id} className="chip" data-store={p.store_id}><input type="checkbox" name="people_ids" value={p.id} defaultChecked={visit?.people_ids.includes(p.id)} />{p.name}</label>
            ))}
            {!people.length && <span className="faint small">Add people first</span>}
          </div>
        </label>
      </div>
      <div className="frow">
        <label className="f">Next visit<input type="date" name="next_visit_date" defaultValue={visit?.next_visit_date || ""} /></label>
        <label className="f" style={{ gridColumn: "span 3" }}>Plan for next visit<input type="text" name="next_visit_plan" defaultValue={visit?.next_visit_plan || ""} placeholder="Check huddle is happening, role play with the two new hires" /></label>
      </div>
      {!visit && (
        <div className="frow wide">
          <label className="f">Follow-ups (one per line, become to-dos)
            <textarea name="followups" placeholder={"Send Russ the word track\nAsk Troy about the scoreboard TV"} style={{ minHeight: 70 }} />
          </label>
        </div>
      )}
    </>
  );
}
