import type { Bookmark, Store } from "@/lib/types";
import { storeAccent } from "@/lib/fmt";
import { deleteBookmark } from "@/app/actions";

/** "Sales Staff Productivity, September 2026" → { short: "Productivity", month: "September 2026" } */
function parseTitle(t: string) {
  const m = t.match(/^(.*?)(?:,\s*)?((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})?$/i);
  const base = (m?.[1] || t).trim().replace(/,$/, "");
  const month = m?.[2] || null;
  const short = base.replace(/Sales Staff Productivity$/i, "Productivity").replace(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+/i, "");
  return { short, month };
}

export function ReportsCard({ reports, stores, children, editor }: { reports: Bookmark[]; stores: Store[]; children?: React.ReactNode; editor?: boolean }) {
  if (!reports.length && !children) return null;
  const group = reports.filter((b) => !b.store_id);
  const byStore = reports.filter((b) => b.store_id);
  const months = Array.from(new Set(reports.map((b) => parseTitle(b.title).month).filter(Boolean)));
  return (
    <section className="card">
      <div className="cardhead"><h2>{months.length === 1 ? `${months[0]} reports` : "Reports"}</h2>{children}</div>
      <div className="reports">
        <div>
          {group.map((b) => {
            const { short } = parseTitle(b.title);
            return <span key={b.id} className="rwrap"><a className="feature" href={b.url} target="_blank" rel="noreferrer"><span className="k">Group</span><span className="t">{short}</span></a>{editor && <form action={deleteBookmark}><input type="hidden" name="id" value={b.id} /><button className="iconbtn" title="Remove">×</button></form>}</span>;
          })}
        </div>
        <div className="grid-chips">
          {byStore.map((b) => {
            const s = stores.find((x) => x.id === b.store_id);
            const { short } = parseTitle(b.title);
            return <span key={b.id} className="rwrap"><a className="chipr" href={b.url} target="_blank" rel="noreferrer" style={{ ["--accent" as string]: storeAccent(s) }}><span className="k">{s?.short_name}</span><span className="t">{short}</span></a>{editor && <form action={deleteBookmark}><input type="hidden" name="id" value={b.id} /><button className="iconbtn" title="Remove">×</button></form>}</span>;
          })}
        </div>
      </div>
    </section>
  );
}
