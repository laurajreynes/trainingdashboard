import Link from "next/link";
import type { Initiative, InitiativePerson, Store } from "@/lib/types";
import { fmtDate, storeAccent, today } from "@/lib/fmt";
import { saveGroupNote } from "@/app/actions";

/** Milestones come from the `carwars` group note, one per line: "Chevrolet | Manager review: 2026-10-15" or "Service | Launch: TBD". */
export type Milestone = { store: string; label: string; when: string };
export function parseLaunches(body: string | null | undefined): Milestone[] {
  return (body || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^(?:(.+?)\s*\|\s*)?(.+?):\s*(.+)$/);
    return m ? { store: (m[1] || "").trim(), label: m[2].trim(), when: m[3].trim() } : { store: "", label: l, when: "" };
  });
}
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const forStore = (m: Milestone, s: Store) => new RegExp(s.short_name.split(" ")[0], "i").test(m.store);
const short = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

type Stop = { title: string; sub?: string; when: string; state: "done" | "now" | "next" | "later"; color?: string };

/** One horizontal track: what's done, what's now, what's coming, in date order. */
function Track({ stops }: { stops: Stop[] }) {
  return (
    <ol className="cwtrack">
      {stops.map((s, i) => (
        <li key={i} className={`cwstop ${s.state}`} style={{ ["--accent" as string]: s.color || "var(--forest)" }}>
          <span className="cwwhen">{s.when}</span>
          <span className="cwdot" />
          <span className="cwtitle">{s.title}</span>
          {s.sub && <span className="cwsub">{s.sub}</span>}
        </li>
      ))}
    </ol>
  );
}

export function CarWarsBanner({ init, roster, stores, store, peopleIds, launches, editor }: {
  init: Initiative; roster: InitiativePerson[]; stores: Store[]; store?: Store; peopleIds?: Set<string>; launches: string | null; editor?: boolean;
}) {
  const t = today();
  const all = parseLaunches(launches);
  const rows = roster.filter((r) => r.initiative_id === init.id && (!peopleIds || peopleIds.has(r.person_id)));
  const live = rows.filter((r) => r.status === "trained" || r.status === "solid").length;
  const mine = store ? all.filter((m) => forStore(m, store)) : all;
  const dated = mine.filter((m) => isDate(m.when)).sort((a, b) => a.when.localeCompare(b.when));
  const tbd = mine.filter((m) => !isDate(m.when));
  const nextIdx = dated.findIndex((m) => m.when >= t);
  const storeOf = (m: Milestone) => stores.find((s) => forStore(m, s));
  const stops: Stop[] = [
    { title: "Initial call", when: "done", state: "done" },
    { title: "Setup", when: "now", state: nextIdx === 0 || dated.length === 0 ? "now" : "done" },
    ...dated.map((m, i): Stop => ({
      title: store ? m.label : `${storeOf(m)?.short_name || m.store}`, sub: store ? undefined : m.label, when: short(m.when),
      state: m.when < t ? "done" : i === nextIdx ? "next" : "later", color: storeOf(m) ? storeAccent(storeOf(m)!) : undefined,
    })),
    ...tbd.map((m): Stop => ({ title: store ? m.label : m.store || m.label, sub: store ? undefined : m.label, when: m.when || "TBD", state: "later" })),
  ];
  const launched = dated.some((m) => m.when < t) || live > 0;
  return (
    <section className="card carwars" style={{ ["--accent" as string]: store ? storeAccent(store) : "var(--sun)" }}>
      <div className="carwars-head">
        <div>
          <div className="eyebrow">CarWars launch{store ? ` · ${store.short_name}` : ""}</div>
          <div className="carwars-now">{nextIdx >= 0 ? `Next: ${store ? "" : (storeOf(dated[nextIdx])?.short_name || dated[nextIdx].store) + " "}${dated[nextIdx].label.toLowerCase()}, ${fmtDate(dated[nextIdx].when, { weekday: true })}` : "Dates coming"}</div>
        </div>
        <div className="carwars-right small">
          {launched ? <><strong>{live}</strong> of {rows.length} live</> : <span className="faint">{rows.length} people come on at launch</span>}
          {" · "}<Link href={`/i/${init.id}`}>open</Link>
        </div>
      </div>
      <Track stops={stops} />
      {editor && !store && (
        <details className="quiet" style={{ marginTop: 8 }}>
          <summary className="small">Edit dates</summary>
          <form action={saveGroupNote} style={{ marginTop: 6 }}>
            <input type="hidden" name="key" value="carwars" />
            <textarea name="body" defaultValue={launches || ""} placeholder={"Store | Milestone: 2026-10-16\nService | Launch: TBD"} style={{ minHeight: 110, fontSize: 13 }} />
            <button className="btn sm ghost" style={{ marginTop: 4 }}>Save</button>
          </form>
        </details>
      )}
    </section>
  );
}
