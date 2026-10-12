import { fmtDate, storeAccent } from "@/lib/fmt";
import Link from "next/link";
import type { Store, Initiative } from "@/lib/types";
import type { BulletinView as BulletinItem } from "@/lib/data";

/** What marketing has flagged lately: lead handling catches, with a note on what the customer wanted. */
export function Bulletin({ items, stores, store, initiative, initiatives, limit = 6 }: {
  items: BulletinItem[]; stores: Store[]; store?: Store; initiative?: Initiative; initiatives?: Initiative[]; limit?: number;
}) {
  const list = (initiative ? items.filter((i) => i.initiative === initiative.id) : store ? items.filter((i) => i.store === store.short_name) : items).slice(0, limit);
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
                {i.shotUrl && (
                  <a href={i.shotUrl} target="_blank" rel="noreferrer" className="bshot" title="Open the screenshot">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={i.shotUrl} alt="" loading="lazy" />
                  </a>
                )}
                <div className="faint">
                  {i.url && <a href={i.url} target="_blank" rel="noreferrer">{i.shotUrl ? "Email" : "Open the email"}</a>}
                  {!initiative && i.initiative && initiatives?.find((x) => x.id === i.initiative) && <> · <Link href={`/i/${i.initiative}`}>{initiatives.find((x) => x.id === i.initiative)!.name}</Link></>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
