import Link from "next/link";
import { getStores, getPeople, getInitiatives, getAllRoster } from "@/lib/data";
import { navOrder, storeAccent, fmtDate } from "@/lib/fmt";
import { ROSTER_LABEL, type RosterStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const ORDER: RosterStatus[] = ["trained", "needs_followup", "not_started"];
const TAG: Record<string, string> = { solid: "good", trained: "good", needs_followup: "warn", not_started: "" };

/** Who's trained, who needs a follow-up, who hasn't been reached: every active initiative, by store. */
export default async function CoveragePage() {
  const [stores, people, initiatives, roster] = await Promise.all([getStores(), getPeople(), getInitiatives(), getAllRoster()]);
  const active = initiatives.filter((i) => i.status === "active" || i.status === "sustaining");
  const byId = new Map(people.map((p) => [p.id, p]));
  return (
    <>
      <div className="pagehead"><div><div className="eyebrow">Training coverage</div><h1>Who&apos;s where</h1></div></div>
      {navOrder(stores).map((s) => {
        const inits = active.filter((i) => i.store_ids.includes(s.id));
        const folks = people.filter((p) => p.active && p.store_id === s.id);
        if (!inits.length) return null;
        return (
          <section key={s.id} id={s.slug} className="card" style={{ marginBottom: 16, borderTop: `3px solid ${storeAccent(s)}` }}>
            <div className="cardhead"><h2><Link href={`/s/${s.slug}`} style={{ color: storeAccent(s) }}>{s.short_name}</Link></h2></div>
            {inits.map((i) => {
              const rows = roster.filter((r) => r.initiative_id === i.id && folks.some((p) => p.id === r.person_id));
              const onRoster = new Set(rows.map((r) => r.person_id));
              const off = folks.filter((p) => !onRoster.has(p.id) && p.role === "Salesperson");
              return (
                <div key={i.id} style={{ marginBottom: 14 }}>
                  <h3 style={{ fontSize: 15, marginBottom: 8 }}><Link href={`/i/${i.id}?store=${s.slug}`}>{i.name}</Link> <span className="faint small">{rows.filter((r) => r.status === "trained" || r.status === "solid").length} of {rows.length} trained</span></h3>
                  <div className="grid cols-3">
                    {ORDER.filter((st) => rows.some((r) => r.status === st)).map((st) => (
                      <div key={st}>
                        <span className={`tag ${TAG[st]}`}>{ROSTER_LABEL[st]} · {rows.filter((r) => r.status === st).length}</span>
                        <ul className="list small" style={{ marginTop: 6 }}>
                          {rows.filter((r) => r.status === st).map((r) => {
                            const p = byId.get(r.person_id); if (!p) return null;
                            return <li key={r.id} style={{ padding: "4px 0" }}><div className="grow"><Link href={`/p/${p.id}`}>{p.name}</Link>{p.location ? <span className="faint"> · {p.location}</span> : null}{r.trained_on && (st === "trained" || st === "solid") ? <span className="faint"> · {fmtDate(r.trained_on)}</span> : null}{r.notes ? <div className="faint" style={{ fontSize: 12 }}>{r.notes.length > 90 ? r.notes.slice(0, 90) + "…" : r.notes}</div> : null}</div></li>;
                          })}
                        </ul>
                      </div>
                    ))}
                    {off.length > 0 && (
                      <div>
                        <span className="tag">Not on this roster · {off.length}</span>
                        <div className="chips" style={{ marginTop: 6 }}>{off.map((p) => <Link key={p.id} href={`/p/${p.id}`} className="chip">{p.name}</Link>)}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
    </>
  );
}
