import { fmtDate, storeAccent } from "@/lib/fmt";
import type { Store } from "@/lib/types";
import type { BulletinItem } from "@/app/api/bulletin/route";

/** What marketing has flagged lately: lead handling catches, with a note on what the customer wanted. */
export function Bulletin({ items, stores, store, limit = 6 }: { items: BulletinItem[]; stores: Store[]; store?: Store; limit?: number }) {
  const list = (store ? items.filter((i) => i.store === store.short_name) : items).slice(0, limit);
  if (!list.length) return null;
  return (
    <section className="card bulletin">
      <div className="cardhead"><h2>From marketing</h2><span className="faint small">lead handling they've flagged</span></div>
      <ul className="list">
        {list.map((i) => {
          const s = stores.find((x) => x.short_name === i.store);
          return (
            <li key={i.id}>
              <span className="dot" style={{ ["--accent" as string]: storeAccent(s) }} />
              <div className="grow small">
                <div><strong>{i.person || i.store || i.from}</strong> <span className="faint">· {fmtDate(i.date)}{i.person && i.store ? ` · ${i.store}` : ""}</span></div>
                <div>{i.note}</div>
                {i.interest && <div className="muted">Customer wanted: {i.interest}</div>}
                {i.url && <a href={i.url} target="_blank" rel="noreferrer" className="faint">Open the email</a>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
