import Link from "next/link";
import { isEditor } from "@/lib/auth";
import { getStores, getPeople, getInitiatives, getExamples, getExampleThemes, signExamples } from "@/lib/data";
import { EXAMPLE_KIND_LABEL, type Example } from "@/lib/types";
import { ExampleUploader } from "@/components/ExampleUploader";
import { ExampleGallery } from "@/components/ExampleGallery";

export const dynamic = "force-dynamic";

type SP = { person?: string; theme?: string; kind?: string; store?: string; initiative?: string; view?: string };

export default async function Examples({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [editor, stores, people, initiatives, themes] = await Promise.all([isEditor(), getStores(), getPeople(), getInitiatives(), getExampleThemes()]);
  const store = stores.find((s) => s.slug === sp.store);
  const all = await getExamples({ limit: 600 });
  const filtered = all.filter((e) =>
    (!sp.person || e.person_ids.includes(sp.person)) &&
    (!sp.theme || (e.theme || "").toLowerCase() === sp.theme.toLowerCase()) &&
    (!sp.kind || e.kind === sp.kind) &&
    (!store || e.store_id === store.id) &&
    (!sp.initiative || e.initiative_id === sp.initiative),
  );
  const views = await signExamples(filtered.slice(0, 200));

  const qs = (patch: Partial<SP>) => {
    const p = new URLSearchParams();
    const merged = { ...sp, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const q = p.toString();
    return `/examples${q ? "?" + q : ""}`;
  };
  const active = [sp.person, sp.theme, sp.kind, sp.store, sp.initiative].filter(Boolean).length;
  const personName = (id: string) => people.find((p) => p.id === id)?.name || "";
  const storeOf = (id: string) => stores.find((s) => s.id === people.find((p) => p.id === id)?.store_id)?.short_name || "";

  // Pattern view: theme × person counts, good vs opportunity
  const themeRows = themes.map((t) => {
    const rows = all.filter((e) => (e.theme || "").toLowerCase() === t.toLowerCase());
    const byPerson = new Map<string, { good: number; opp: number; pat: number }>();
    for (const e of rows) for (const pid of e.person_ids) {
      const c = byPerson.get(pid) || { good: 0, opp: 0, pat: 0 };
      if (e.kind === "good") c.good++; else if (e.kind === "opportunity") c.opp++; else c.pat++;
      byPerson.set(pid, c);
    }
    return { theme: t, total: rows.length, opp: rows.filter((e) => e.kind === "opportunity").length, good: rows.filter((e) => e.kind === "good").length, byPerson };
  }).sort((a, b) => b.total - a.total);
  const personRows = people.filter((p) => all.some((e) => e.person_ids.includes(p.id))).map((p) => {
    const rows = all.filter((e) => e.person_ids.includes(p.id));
    const oppThemes = [...new Set(rows.filter((e) => e.kind === "opportunity" && e.theme).map((e) => e.theme!))];
    return { p, total: rows.length, good: rows.filter((e) => e.kind === "good").length, opp: rows.filter((e) => e.kind === "opportunity").length, oppThemes };
  }).sort((a, b) => b.opp - a.opp || b.total - a.total);

  const uploaderPeople = people.filter((p) => p.active).map((p) => ({ id: p.id, name: p.name, sub: stores.find((s) => s.id === p.store_id)?.short_name }));
  const galleryPeople = people.map((p) => ({ id: p.id, name: p.name }));
  const initOpts = initiatives.filter((i) => i.status !== "done").map((i) => ({ id: i.id, name: i.name }));
  const storeOpts = stores.map((s) => ({ id: s.id, name: s.short_name }));

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Screenshots and examples</div>
          <h1>Examples</h1>
        </div>
        <div className="small" style={{ display: "flex", gap: 10 }}>
          <Link href={qs({ view: undefined })} className={sp.view !== "patterns" ? "" : "faint"}>Gallery</Link>
          <Link href={qs({ view: "patterns" })} className={sp.view === "patterns" ? "" : "faint"}>Patterns</Link>
        </div>
      </div>

      {editor && (
        <details className="adder" style={{ marginBottom: 18 }} open={all.length === 0}>
          <summary>Add screenshots</summary>
          <div className="body">
            <ExampleUploader people={uploaderPeople} initiatives={initOpts} stores={storeOpts} themes={themes}
              defaults={{ personIds: sp.person ? [sp.person] : [], initiativeId: sp.initiative, storeId: store?.id, theme: sp.theme }} />
          </div>
        </details>
      )}

      {sp.view === "patterns" ? (
        <div className="grid cols-2">
          <section className="card">
            <div className="cardhead"><h2>By theme</h2></div>
            {themeRows.length ? (
              <table className="tbl">
                <thead><tr><th>Theme</th><th className="num">Good</th><th className="num">Opp.</th><th>Who keeps showing up</th></tr></thead>
                <tbody>
                  {themeRows.map((r) => {
                    const top = [...r.byPerson.entries()].filter(([, c]) => c.opp > 0).sort((a, b) => b[1].opp - a[1].opp).slice(0, 4);
                    return (
                      <tr key={r.theme}>
                        <td><Link href={qs({ theme: r.theme, view: undefined })} style={{ fontWeight: 600 }}>{r.theme}</Link></td>
                        <td className="num" style={{ color: "var(--good)" }}>{r.good}</td>
                        <td className="num" style={{ color: r.opp ? "var(--warn)" : undefined }}>{r.opp}</td>
                        <td className="small muted">{top.map(([pid, c], i) => <span key={pid}>{i ? ", " : ""}<Link href={qs({ person: pid, theme: r.theme, kind: "opportunity", view: undefined })}>{personName(pid)}</Link> ({c.opp})</span>)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : <p className="empty">Add a theme to your examples and patterns show up here</p>}
          </section>
          <section className="card">
            <div className="cardhead"><h2>By person</h2></div>
            {personRows.length ? (
              <table className="tbl">
                <thead><tr><th>Name</th><th className="num">Good</th><th className="num">Opp.</th><th>Opportunity themes</th></tr></thead>
                <tbody>
                  {personRows.map(({ p, good, opp, oppThemes }) => (
                    <tr key={p.id}>
                      <td><Link href={`/p/${p.id}`} style={{ fontWeight: 600 }}>{p.name}</Link> <span className="faint small">{storeOf(p.id)}</span></td>
                      <td className="num" style={{ color: "var(--good)" }}>{good}</td>
                      <td className="num" style={{ color: opp ? "var(--warn)" : undefined }}>{opp}</td>
                      <td className="small muted">{oppThemes.map((t, i) => <span key={t}>{i ? ", " : ""}<Link href={qs({ person: p.id, theme: t, view: undefined })}>{t}</Link></span>)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="empty">Tag people on your examples and they show up here</p>}
          </section>
        </div>
      ) : (
        <>
          <div className="filters">
            <select name="kind" defaultValue={sp.kind || ""} data-nav>
              <option value="">Any kind</option>
              {(Object.keys(EXAMPLE_KIND_LABEL) as Example["kind"][]).map((k) => <option key={k} value={k}>{EXAMPLE_KIND_LABEL[k]}</option>)}
            </select>
            <select name="theme" defaultValue={sp.theme || ""} data-nav>
              <option value="">Any theme</option>
              {themes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select name="person" defaultValue={sp.person || ""} data-nav>
              <option value="">Anyone</option>
              {people.filter((p) => all.some((e) => e.person_ids.includes(p.id))).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select name="store" defaultValue={sp.store || ""} data-nav>
              <option value="">Any store</option>
              {stores.map((s) => <option key={s.id} value={s.slug}>{s.short_name}</option>)}
            </select>
            <select name="initiative" defaultValue={sp.initiative || ""} data-nav>
              <option value="">Any initiative</option>
              {initiatives.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            {active > 0 && <Link href="/examples" className="small">Clear</Link>}
            <span className="faint small" style={{ marginLeft: "auto" }}>{filtered.length} of {all.length}</span>
          </div>
          <FilterNav />
          <ExampleGallery items={views} people={galleryPeople} initiatives={initOpts} stores={storeOpts} themes={themes} editor={editor}
            emptyText={all.length ? "Nothing matches those filters" : "No examples yet. Add the first screenshot above."} />
        </>
      )}
    </>
  );
}

/** Tiny script so the filter selects navigate without a submit button. */
function FilterNav() {
  const js = `document.querySelectorAll('.filters select[data-nav]').forEach(function(s){s.addEventListener('change',function(){var u=new URL(location.href);document.querySelectorAll('.filters select[data-nav]').forEach(function(x){x.value?u.searchParams.set(x.name,x.value):u.searchParams.delete(x.name)});u.searchParams.delete('view');location.href=u.toString();});});`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
