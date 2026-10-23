import Link from "next/link";
import type { Initiative, InitiativePerson, Store } from "@/lib/types";
import { fmtDate, storeAccent, today } from "@/lib/fmt";
import { saveGroupNote } from "@/app/actions";
import { CarWarsSetup } from "@/components/CarWarsSetup";
import { SETUP_SEED } from "@/lib/cwsetup";

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

type Stop = { title: string; sub?: string; when: string; iso?: string; state: "done" | "now" | "next" | "later"; color?: string; launch?: boolean };

/** Where "today" sits on the track: stops are evenly spaced, so interpolate by date between the last passed stop and the next one. */
function nowFraction(stops: Stop[], t: string): number {
  const n = stops.length; if (n < 2) return 0;
  const pos = (i: number) => (i + 0.5) / n;
  let a = 0;   // Setup is always "passed"
  for (let i = 1; i < n; i++) if (stops[i].iso && stops[i].iso! <= t) a = i;
  let b = -1;
  for (let i = a + 1; i < n; i++) if (stops[i].iso) { b = i; break; }
  if (b < 0) return pos(a);
  const d = (x: string) => new Date(x + "T12:00:00").getTime();
  const start = stops[a].iso ? d(stops[a].iso!) : d(t) - 7 * 864e5;   // Setup has no date: assume a week before the first milestone
  const span = Math.max(1, d(stops[b].iso!) - start);
  const f = Math.min(1, Math.max(0, (d(t) - start) / span));
  return pos(a) + (pos(b) - pos(a)) * f;
}

/** One horizontal track: what's done, what's now, what's coming, in date order. */
function Track({ stops, t }: { stops: Stop[]; t: string }) {
  const f = nowFraction(stops, t);
  return (
    <ol className="cwtrack">
      <span className="cwfill" style={{ width: `${f * 100}%` }} aria-hidden="true" />
      <span className="cwnow" style={{ left: `${f * 100}%` }} aria-hidden="true" title="Today" />
      {stops.map((s, i) => (
        <li key={i} className={`cwstop ${s.state}`} style={{ ["--accent" as string]: s.color || "var(--forest)" }}>
          <span className="cwwhen">{s.when}</span>
          <span className={`cwdot${s.launch ? " launch" : ""}`}>{s.launch ? "★" : ""}</span>
          <span className="cwtitle">{s.title}</span>
          {s.sub && <span className="cwsub">{s.sub}</span>}
        </li>
      ))}
    </ol>
  );
}

export function CarWarsBanner({ init, roster, stores, store, location, peopleIds, launches, editor, withBdc, setup }: {
  init: Initiative; roster: InitiativePerson[]; stores: Store[]; store?: Store; location?: string; peopleIds?: Set<string>; launches: string | null; editor?: boolean;
  /** Store pages whose leads start in the Ressler BDC: show the BDC launch next to the store's own sales launch. */
  withBdc?: boolean;
  /** Per-person setup progress for this store (the cwsetup:<slug> group note). */
  setup?: string | null;
}) {
  const t = today();
  const all = parseLaunches(launches);
  const isBdc = (m: Milestone) => /bdc/i.test(m.store);
  const mine = location ? all.filter((m) => new RegExp(location, "i").test(m.store))
    : store ? all.filter((m) => forStore(m, store) || (withBdc && isBdc(m)))
    : all;
  // On a store page, name the two launches so both dates read clearly.
  const label = (m: Milestone) => store && withBdc && /launch/i.test(m.label) ? (isBdc(m) ? "BDC launch" : /service/i.test(m.store) ? "Service launch" : "Sales launch") : m.label;
  // "Subaru | Note: awaiting phone programming" lines read as a note under the track, not a stop
  const notes = mine.filter((m) => /^note$/i.test(m.label)).map((m) => m.when);
  const stops0 = mine.filter((m) => !/^note$/i.test(m.label));
  const dated = stops0.filter((m) => isDate(m.when)).sort((a, b) => a.when.localeCompare(b.when));
  const tbd = stops0.filter((m) => !isDate(m.when));
  const nextIdx = dated.findIndex((m) => m.when >= t);
  const storeOf = (m: Milestone) => stores.find((s) => forStore(m, s));
  const isLaunch = (m: Milestone) => /launch/i.test(m.label);
  const stops: Stop[] = [
    { title: "Setup", when: "now", state: nextIdx === 0 || dated.length === 0 ? "now" : "done" },
    ...dated.map((m, i): Stop => ({
      title: store ? label(m) : `${storeOf(m)?.short_name || m.store}`, sub: store ? undefined : m.label, when: short(m.when), iso: m.when,
      state: m.when < t ? "done" : i === nextIdx ? "next" : "later", color: storeOf(m) ? storeAccent(storeOf(m)!) : undefined, launch: isLaunch(m),
    })),
    ...tbd.map((m): Stop => ({ title: store ? label(m) : m.store || m.label, sub: store ? undefined : m.label, when: m.when || "TBD", state: "later" })),
  ];
  return (
    <section className="card carwars" style={{ ["--accent" as string]: store ? storeAccent(store) : "var(--sun)" }}>
      <div className="carwars-head">
        <div>
          <h2 className="carwars-h">CarWars launch{location ? ` · ${location}` : store ? ` · ${store.short_name}` : ""}</h2>
        </div>
        <div className="carwars-right small">
          {editor && <Link href={`/i/${init.id}`}>open</Link>}
        </div>
      </div>
      <Track stops={stops} t={t} />
      {notes.length > 0 && <p className="small muted cwnote">{notes.join(" · ")}</p>}
      {store && !location && (setup || editor || SETUP_SEED[store.slug]) && <CarWarsSetup body={setup || SETUP_SEED[store.slug] || null} storeSlug={store.slug} editor={editor} />}
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
