import Link from "next/link";
import { isEditor } from "@/lib/auth";
import { getStores, getBookmarks } from "@/lib/data";
import { storeAccent } from "@/lib/fmt";
import { addBookmark, archiveBookmark, deleteBookmark } from "@/app/actions";

export const dynamic = "force-dynamic";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Which month a report covers: from its title ("September 2026", "Sept", "Oct 1 to 15"), else when it was added. */
function monthOf(title: string, created: string): string {
  const y = title.match(/\b(20\d\d)\b/)?.[1] || created.slice(0, 4);
  const i = MONTHS.findIndex((m) => new RegExp(`\\b${m.slice(0, 3)}`, "i").test(title));
  if (i >= 0) return `${y}-${String(i + 1).padStart(2, "0")}`;
  return created.slice(0, 7);
}

export default async function ReportArchive() {
  const [editor, stores, all] = await Promise.all([isEditor(), getStores(), getBookmarks()]);
  const archived = all.filter((b) => b.kind === "archive");
  const months = [...new Set(archived.map((b) => monthOf(b.title, (b.created_at || ""))))].sort().reverse();
  const storeName = (id: string | null) => stores.find((s) => s.id === id)?.short_name || "Group";

  return (
    <>
      <div className="pagehead"><div><div className="eyebrow"><Link href="/">Reports</Link></div><h1>Report archive</h1></div></div>
      <div className="stack">
        {months.length === 0 && <p className="empty">Nothing archived yet. Use ↓ on a report to move it here.</p>}
        {months.map((m) => {
          const [y, mo] = m.split("-");
          const list = archived.filter((b) => monthOf(b.title, (b.created_at || "")) === m).sort((a, b) => (a.store_id ? 1 : 0) - (b.store_id ? 1 : 0) || storeName(a.store_id).localeCompare(storeName(b.store_id)));
          return (
            <section key={m} className="card">
              <div className="cardhead"><h2>{MONTHS[Number(mo) - 1]} {y}</h2><span className="small muted">{list.length}</span></div>
              <ul className="list">
                {list.map((b) => {
                  const s = stores.find((x) => x.id === b.store_id);
                  return (
                    <li key={b.id}>
                      <span className="tag" style={{ color: storeAccent(s) }}>{storeName(b.store_id)}</span>
                      <div className="grow"><a href={b.url} target="_blank" rel="noreferrer">{b.title}</a></div>
                      {editor && <>
                        <form action={archiveBookmark}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="to" value="report" /><button className="iconbtn" title="Back to current reports">↑</button></form>
                        <form action={deleteBookmark}><input type="hidden" name="id" value={b.id} /><button className="iconbtn" title="Delete">×</button></form>
                      </>}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {editor && (
          <details className="card quiet">
            <summary className="small">Add a link to the archive</summary>
            <form action={addBookmark} className="inline" style={{ marginTop: 8 }}>
              <input type="hidden" name="kind" value="archive" />
              <input type="text" name="title" placeholder="Title (Group Phone and Internet Performance, September 2026)" required style={{ flex: 2, minWidth: 240 }} />
              <input type="text" name="url" placeholder="URL" required style={{ flex: 2, minWidth: 200 }} />
              <select name="store_id" style={{ width: "auto" }}><option value="">Group</option>{stores.map((s) => <option key={s.id} value={s.id}>{s.short_name}</option>)}</select>
              <button className="btn sm">Add</button>
            </form>
          </details>
        )}
      </div>
    </>
  );
}
