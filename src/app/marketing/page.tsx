import Link from "next/link";
import { getStores, getInitiatives, getAllRoster, getStages, getAreas, getBulletin, getVisits, getGroupNotes } from "@/lib/data";
import { saveGroupNote } from "@/app/actions";
import { isEditor } from "@/lib/auth";
import { storeAccent, fmtDate, today } from "@/lib/fmt";
import { Bulletin } from "@/components/Bulletin";
import { CarWarsBanner } from "@/components/CarWars";
import { AREA_DEFAULT } from "@/lib/types";

export const dynamic = "force-dynamic";

/** For marketing: what training is doing that touches their world. CarWars, the initiatives by store, and what they've flagged. */
export default async function MarketingPage() {
  const [stores, initiatives, roster, stages, areas, bulletin, visits, notes, editor] = await Promise.all([getStores(), getInitiatives(), getAllRoster(), getStages(), getAreas(), getBulletin(), getVisits({ limit: 400 }), getGroupNotes(), isEditor()]);
  const note = notes.find((n) => n.key === "marketing")?.body || "";
  const carwarsDates = notes.find((n) => n.key === "carwars")?.body || null;
  const live = initiatives.filter((i) => i.status !== "done");
  const carwars = live.find((i) => /carwars/i.test(i.name));
  const rest = live.filter((i) => i !== carwars);
  const trained = (id: string) => { const r = roster.filter((x) => x.initiative_id === id); return { t: r.filter((x) => x.status === "trained" || x.status === "solid").length, n: r.length }; };
  // Livingston first, then the rest in nav order
  const order = [...stores].sort((a, b) => (/livingston/i.test(a.name) ? -1 : /livingston/i.test(b.name) ? 1 : a.sort_order - b.sort_order));
  const t = today();
  const lastVisit = (storeId: string) => visits.filter((v) => v.store_id === storeId && v.date <= t).sort((a, b) => b.date.localeCompare(a.date))[0];

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">For marketing</div>
          <h1>What training is working on</h1>
        </div>
      </div>
      <p className="muted" style={{ maxWidth: 640, marginBottom: 18 }}>
        Where CarWars stands, what each store is being trained on right now, and the lead-handling catches you've sent over.
      </p>

      {(note || editor) && (
        <section className="card" style={{ marginBottom: 18, borderLeft: "3px solid var(--gold)" }}>
          <div className="cardhead"><h2>Heads up</h2></div>
          {note && <p className="pre">{note}</p>}
          {editor && (
            <details className="quiet" style={{ marginTop: 6 }}>
              <summary className="small">Edit</summary>
              <form action={saveGroupNote} style={{ marginTop: 6 }}>
                <input type="hidden" name="key" value="marketing" />
                <textarea name="body" defaultValue={note} placeholder="What marketing should know this week" style={{ minHeight: 80, fontSize: 13 }} />
                <button className="btn sm ghost" style={{ marginTop: 4 }}>Save</button>
              </form>
            </details>
          )}
        </section>
      )}

      {carwars && (
        <div style={{ marginBottom: 18 }}>
          <CarWarsBanner init={carwars} roster={roster} stores={stores} launches={carwarsDates} />
          {carwars.description && <p className="pre small muted" style={{ margin: "8px 4px 0" }}>{carwars.description.replace(/^Progress\n/, "")}</p>}
        </div>
      )}

      <section style={{ marginBottom: 18 }}>
        <div className="cardhead"><h2>Initiatives by store</h2><Link className="more" href="/initiatives">All</Link></div>
        <div className="grid cols-2">
          {order.map((s) => {
            const mine = rest.filter((i) => i.store_ids.includes(s.id));
            if (!mine.length) return null;
            const lv = lastVisit(s.id);
            return (
              <section key={s.id} className="card" style={{ borderTop: `3px solid ${storeAccent(s)}` }}>
                <div className="cardhead"><h2 style={{ color: storeAccent(s) }}><Link href={`/s/${s.slug}`} style={{ color: "inherit" }}>{s.short_name}</Link></h2>{lv && <span className="faint small">last session {fmtDate(lv.date)}</span>}</div>
                <ul className="list">
                  {mine.map((i) => {
                    const c = trained(i.id);
                    return (
                      <li key={i.id}>
                        <div className="grow small">
                          <div><strong>{i.name}</strong></div>
                          {i.goal_text && <div className="muted">{i.goal_text}</div>}
                          <div className="faint">{stages[i.id] || "Planning"} · {areas[i.id] || AREA_DEFAULT} · {c.t} of {c.n} trained</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </section>

      <Bulletin items={bulletin} stores={stores} initiatives={initiatives} limit={12} />
      {!bulletin.length && <p className="faint small">Nothing from marketing on the bulletin yet.</p>}
    </>
  );
}
