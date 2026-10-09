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

/** The CarWars launch, pinned on every page. Home: group progress and every store's dates. Store page: that store's plan only. */
export function CarWarsBanner({ init, roster, stores, store, peopleIds, launches, editor }: {
  init: Initiative; roster: InitiativePerson[]; stores: Store[]; store?: Store; peopleIds?: Set<string>; launches: string | null; editor?: boolean;
}) {
  const steps = (init.description || "").split(/\r?\n/).map((l) => l.trim()).filter((l) => /^[✓●○]/.test(l));
  const current = steps.find((l) => l.startsWith("●"));
  const all = parseLaunches(launches);
  const rows = roster.filter((r) => r.initiative_id === init.id && (!peopleIds || peopleIds.has(r.person_id)));
  const live = rows.filter((r) => r.status === "trained" || r.status === "solid").length;
  const t = today();
  const when = (m: Milestone) => isDate(m.when) ? fmtDate(m.when, { weekday: true }) : m.when || "TBD";

  if (store) {
    const mine = all.filter((m) => forStore(m, store)).sort((a, b) => (isDate(a.when) ? a.when : "9").localeCompare(isDate(b.when) ? b.when : "9"));
    const next = mine.find((m) => isDate(m.when) && m.when >= t);
    return (
      <section className="card carwars" style={{ ["--accent" as string]: storeAccent(store) }}>
        <div className="carwars-main">
          <div className="eyebrow">CarWars at {store.short_name}</div>
          <div className="carwars-now">{next ? `${next.label}: ${when(next)}` : mine.length ? "Dates set" : "Dates coming"}</div>
          {mine.length > 0 && (
            <ol className="carwars-plan">
              {mine.map((m) => <li key={m.label} className={isDate(m.when) && m.when < t ? "done" : m === next ? "now" : ""}><span className="l">{m.label}</span><span className="w">{when(m)}</span></li>)}
            </ol>
          )}
        </div>
        <div className="carwars-side">
          {live > 0 || mine.some((m) => isDate(m.when) && m.when < t) ? (
            <>
              <div className="eyebrow">Live on CarWars</div>
              <div className="carwars-live"><strong>{live}</strong> of {rows.length}</div>
              <div className="small faint">Checked off as they're set up and trained · <Link href={`/i/${init.id}`}>open</Link></div>
            </>
          ) : (
            <>
              <div className="eyebrow">Status</div>
              <div className="carwars-live" style={{ fontSize: 20 }}>Not set up yet</div>
              <div className="small faint">{rows.length} people will come on when it launches · <Link href={`/i/${init.id}`}>open</Link></div>
            </>
          )}
        </div>
      </section>
    );
  }

  const byStore = stores.filter((s) => all.some((m) => forStore(m, s))).sort((a, b) => a.sort_order - b.sort_order);
  const other = all.filter((m) => !stores.some((s) => forStore(m, s)));
  const next = all.filter((m) => isDate(m.when) && m.when >= t).sort((a, b) => a.when.localeCompare(b.when))[0];
  return (
    <section className="card carwars">
      <div className="carwars-main">
        <div className="eyebrow">CarWars launch</div>
        <div className="carwars-now">{current ? current.replace(/^●\s*/, "") : "Planning"}</div>
        <div className="carwars-steps">{steps.map((l, i) => <span key={i} className={l.startsWith("✓") ? "done" : l.startsWith("●") ? "now" : ""}>{l.replace(/^[✓●○]\s*/, "")}</span>)}</div>
        <div className="small faint">{next ? `Next up: ${next.store} ${next.label.toLowerCase()}, ${fmtDate(next.when)} · ` : ""}{live > 0 ? <><strong>{live}</strong> of {rows.length} live · </> : ""}<Link href={`/i/${init.id}`}>open</Link></div>
      </div>
      <div className="carwars-side">
        <div className="eyebrow">Dates</div>
        <div className="carwars-dates">
          {byStore.map((s) => (
            <div key={s.id} className="carwars-store">
              <div className="k" style={{ color: storeAccent(s) }}>{s.short_name}</div>
              {all.filter((m) => forStore(m, s)).map((m) => <div key={m.label} className="carwars-date"><span>{m.label}</span><strong>{when(m)}</strong></div>)}
            </div>
          ))}
          {other.map((m) => <div key={m.label} className="carwars-store"><div className="k">{m.store || m.label}</div><div className="carwars-date"><span>{m.store ? m.label : ""}</span><strong>{when(m)}</strong></div></div>)}
        </div>
        {editor && (
          <details className="quiet" style={{ marginTop: 6 }}>
            <summary className="small">Edit dates</summary>
            <form action={saveGroupNote} style={{ marginTop: 6 }}>
              <input type="hidden" name="key" value="carwars" />
              <textarea name="body" defaultValue={launches || ""} placeholder={"Store | Milestone: 2026-10-16\nService | Launch: TBD"} style={{ minHeight: 110, fontSize: 13 }} />
              <button className="btn sm ghost" style={{ marginTop: 4 }}>Save</button>
            </form>
          </details>
        )}
      </div>
    </section>
  );
}
