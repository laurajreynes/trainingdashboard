import Link from "next/link";
import type { Initiative, InitiativePerson, Store } from "@/lib/types";
import { fmtDate, storeAccent } from "@/lib/fmt";
import { saveGroupNote } from "@/app/actions";

/** Launch dates come from the `carwars` group note, one per line: "Subaru: 2026-10-16" or "Toyota/Chevy Sales: 2026-11-01" or "Service: TBD". */
export function parseLaunches(body: string | null | undefined): { label: string; when: string }[] {
  return (body || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^(.+?):\s*(.+)$/); return m ? { label: m[1].trim(), when: m[2].trim() } : { label: l, when: "" };
  });
}
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

/** The CarWars launch, pinned on every page: progress, this store's launch date, and who's live. */
export function CarWarsBanner({ init, roster, stores, store, peopleIds, launches, editor }: {
  init: Initiative; roster: InitiativePerson[]; stores: Store[]; store?: Store; peopleIds?: Set<string>; launches: string | null; editor?: boolean;
}) {
  const steps = (init.description || "").split(/\r?\n/).map((l) => l.trim()).filter((l) => /^[✓●○]/.test(l));
  const current = steps.find((l) => l.startsWith("●"));
  const done = steps.filter((l) => l.startsWith("✓")).length;
  const all = parseLaunches(launches);
  // On a store page, show the launches that mention this store (or everything on the home page)
  const mine = store ? all.filter((l) => new RegExp(store.short_name.split(" ")[0], "i").test(l.label) || /service/i.test(l.label)) : all;
  const rows = roster.filter((r) => r.initiative_id === init.id && (!peopleIds || peopleIds.has(r.person_id)));
  const live = rows.filter((r) => r.status === "trained" || r.status === "solid").length;
  const next = all.filter((l) => isDate(l.when)).sort((a, b) => a.when.localeCompare(b.when))[0];
  return (
    <section className="card carwars">
      <div className="carwars-main">
        <div className="eyebrow">CarWars launch</div>
        <div className="carwars-now">{current ? current.replace(/^●\s*/, "") : "Planning"}</div>
        <div className="carwars-steps">{steps.map((l, i) => <span key={i} className={l.startsWith("✓") ? "done" : l.startsWith("●") ? "now" : ""}>{l.replace(/^[✓●○]\s*/, "")}</span>)}</div>
        <div className="small faint">{done} of {steps.length} steps · <Link href={`/i/${init.id}`}>open</Link></div>
      </div>
      <div className="carwars-side">
        <div className="eyebrow">{store ? "Launch" : "Launch dates"}</div>
        {mine.length ? mine.map((l) => {
          const s = stores.find((x) => new RegExp(x.short_name.split(" ")[0], "i").test(l.label));
          return <div key={l.label} className="carwars-date"><span className="k" style={{ color: storeAccent(s) }}>{l.label}</span><strong>{isDate(l.when) ? fmtDate(l.when, { weekday: true }) : l.when || "TBD"}</strong></div>;
        }) : <div className="faint small">No date yet</div>}
        {!store && next && <div className="small faint" style={{ marginTop: 4 }}>Next up: {next.label}, {fmtDate(next.when)}</div>}
        <div className="small" style={{ marginTop: 6 }}><strong>{live}</strong> of {rows.length} live{store ? "" : " across the group"}</div>
        {editor && !store && (
          <details className="quiet" style={{ marginTop: 6 }}>
            <summary className="small">Edit dates</summary>
            <form action={saveGroupNote} style={{ marginTop: 6 }}>
              <input type="hidden" name="key" value="carwars" />
              <textarea name="body" defaultValue={launches || ""} placeholder={"Subaru: 2026-10-16\nToyota/Chevy Sales: 2026-11-01\nService: TBD"} style={{ minHeight: 70, fontSize: 13 }} />
              <button className="btn sm ghost" style={{ marginTop: 4 }}>Save</button>
            </form>
          </details>
        )}
      </div>
    </section>
  );
}
