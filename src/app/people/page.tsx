import Link from "next/link";
import { isEditor } from "@/lib/auth";
import { getStores, getPeople, getAllRoster, getInitiatives } from "@/lib/data";
import { ROLES } from "@/lib/types";
import { addPerson, importPeople } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function People({ searchParams }: { searchParams: Promise<{ store?: string; all?: string }> }) {
  const sp = await searchParams;
  const [editor, stores, people, roster, initiatives] = await Promise.all([isEditor(), getStores(), getPeople(), getAllRoster(), getInitiatives()]);
  const liveInits = initiatives.filter((i) => i.status === "active" || i.status === "sustaining");
  const filter = stores.find((s) => s.slug === sp.store);
  const shown = stores.filter((s) => !filter || s.id === filter.id || (s.shows_under.includes(filter.slug)));

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Roster</div>
          <h1>People</h1>
          <div className="sub small" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/people" className={!filter ? "" : "faint"}>All</Link>
            {stores.map((s) => <Link key={s.id} href={`/people?store=${s.slug}`} className={filter?.id === s.id ? "" : "faint"}>{s.short_name}</Link>)}
            {!sp.all ? <Link href={`/people?${filter ? `store=${filter.slug}&` : ""}all=1`} className="faint">show inactive</Link> : <Link href={`/people${filter ? `?store=${filter.slug}` : ""}`} className="faint">hide inactive</Link>}
          </div>
        </div>
      </div>

      <div className="stack">
        {shown.map((s) => {
          const rows = people.filter((p) => p.store_id === s.id && (sp.all || p.active));
          if (!rows.length && !editor) return null;
          return (
            <section key={s.id} className="card" style={{ ["--accent" as string]: s.accent }}>
              <div className="cardhead"><h2 style={{ color: s.accent }}>{s.name}</h2><span className="faint small">{rows.length}</span></div>
              {rows.length ? (
                <table className="tbl">
                  <thead><tr><th>Name</th><th>Role</th>{s.locations.length > 0 && <th>Location</th>}{liveInits.map((i) => <th key={i.id} title={i.name}>{i.name.length > 22 ? i.name.slice(0, 22) + "…" : i.name}</th>)}</tr></thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p.id} style={p.active ? undefined : { opacity: 0.5 }}>
                        <td><Link href={`/p/${p.id}`} style={{ fontWeight: 600 }}>{p.name}</Link></td>
                        <td className="muted small">{p.role}</td>
                        {s.locations.length > 0 && <td className="muted small">{p.location || ""}</td>}
                        {liveInits.map((i) => {
                          const r = roster.find((x) => x.initiative_id === i.id && x.person_id === p.id);
                          const mark = !r ? "" : r.status === "solid" ? "●●" : r.status === "trained" ? "●" : r.status === "needs_followup" ? "!" : "○";
                          const color = !r ? undefined : r.status === "solid" ? "var(--good)" : r.status === "trained" ? "var(--gold)" : r.status === "needs_followup" ? "var(--warn)" : "var(--ink-faint)";
                          return <td key={i.id} style={{ color, fontWeight: 700 }} title={r ? r.status : "not on roster"}>{mark}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="empty">Nobody here yet</p>}
              {editor && (
                <div className="grid cols-2" style={{ marginTop: 12 }}>
                  <details className="adder">
                    <summary>Add one person</summary>
                    <form action={addPerson} className="body">
                      <input type="hidden" name="store_id" value={s.id} />
                      <div className="frow">
                        <input type="text" name="name" placeholder="Name" required />
                        <select name="role">{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
                        {s.locations.length > 0 && <select name="location"><option value="">Main store</option>{s.locations.map((l) => <option key={l}>{l}</option>)}</select>}
                      </div>
                      <button className="btn sm">Add</button>
                    </form>
                  </details>
                  <details className="adder">
                    <summary>Paste a list</summary>
                    <form action={importPeople} className="body">
                      <input type="hidden" name="store_id" value={s.id} />
                      <div className="frow wide"><textarea name="names" placeholder={"One name per line"} required /></div>
                      <div className="frow">
                        <select name="role">{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
                        {s.locations.length > 0 && <select name="location"><option value="">Main store</option>{s.locations.map((l) => <option key={l}>{l}</option>)}</select>}
                      </div>
                      <button className="btn sm">Import</button>
                    </form>
                  </details>
                </div>
              )}
            </section>
          );
        })}
        {liveInits.length > 0 && <p className="faint small">Columns: ●● solid · ● trained · ! follow up · ○ not yet</p>}
      </div>
    </>
  );
}
