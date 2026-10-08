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
  const isShop = (b: Bookmark) => /mystery shop/i.test(b.title);
  const shops = reports.filter(isShop);
  const group = reports.filter((b) => !b.store_id && !isShop(b));
  const byStore = reports.filter((b) => b.store_id && !isShop(b));
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
        <div className="bystore">
          {stores.filter((s) => byStore.some((b) => b.store_id === s.id)).sort((a, b) => a.sort_order - b.sort_order).map((s) => (
            <div key={s.id} className="storecol" style={{ ["--accent" as string]: storeAccent(s) }}>
              <div className="storecol-h">{s.short_name}</div>
              {byStore.filter((b) => b.store_id === s.id).map((b) => {
                const { short } = parseTitle(b.title);
                return <span key={b.id} className="rwrap"><a className="rlink" href={b.url} target="_blank" rel="noreferrer">{short}</a>{editor && <form action={deleteBookmark}><input type="hidden" name="id" value={b.id} /><button className="iconbtn" title="Remove">×</button></form>}</span>;
              })}
            </div>
          ))}
          {shops.length > 0 && (
            <div className="storecol" style={{ ["--accent" as string]: "var(--forest)" }}>
              <div className="storecol-h">Mystery shops</div>
              {shops.map((b) => {
                const s = stores.find((x) => x.id === b.store_id);
                return <span key={b.id} className="rwrap"><a className="rlink" href={b.url} target="_blank" rel="noreferrer" style={{ color: storeAccent(s) }}>{parseTitle(b.title).short.replace(/^Competitive Mystery Shop,?\s*/i, "")}</a>{editor && <form action={deleteBookmark}><input type="hidden" name="id" value={b.id} /><button className="iconbtn" title="Remove">×</button></form>}</span>;
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
