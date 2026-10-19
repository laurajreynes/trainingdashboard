import type { Bookmark, Store } from "@/lib/types";
import { storeAccent, today } from "@/lib/fmt";
import { deleteBookmark } from "@/app/actions";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "Sales Staff Productivity, September 2026" → { short: "Productivity", month: "September 2026" } */
function parseTitle(t: string) {
  const m = t.match(/^(.*?)(?:,\s*)?((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})?$/i);
  const base = (m?.[1] || t).trim().replace(/,$/, "");
  const month = m?.[2] || null;
  const short = base.replace(/Sales Staff Productivity$/i, "Productivity").replace(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+/i, "");
  return { short, month };
}

/** Does the title name this month ("October", "Oct 1 to 15", "October to date")? */
function namesMonth(title: string, mi: number) {
  const full = MONTHS[mi]; const abbr = full.slice(0, 3);
  return new RegExp(`\\b(${full}|${abbr})\\b`, "i").test(title);
}

export function ReportsCard({ reports, stores, children, editor, compact }: { reports: Bookmark[]; stores: Store[]; children?: React.ReactNode; editor?: boolean; compact?: boolean }) {
  if (!reports.length && !children) return null;
  const isShop = (b: Bookmark) => /mystery shop/i.test(b.title);
  const mi = Number(today().slice(5, 7)) - 1;
  const shops = reports.filter(isShop);
  const rest = reports.filter((b) => !isShop(b));
  // Once this month's reports are in, last month's step back to one quiet line.
  const current = rest.filter((b) => namesMonth(b.title, mi));
  const hasCurrent = current.length > 0;
  const shown = hasCurrent ? current : rest;
  const older = hasCurrent ? rest.filter((b) => !namesMonth(b.title, mi)) : [];
  const group = shown.filter((b) => !b.store_id);
  const byStore = shown.filter((b) => b.store_id);
  const del = (b: Bookmark) => editor && <form action={deleteBookmark}><input type="hidden" name="id" value={b.id} /><button className="iconbtn" title="Remove">×</button></form>;
  const shopLinks = shops.map((b) => {
    const s = stores.find((x) => x.id === b.store_id);
    return <span key={b.id} className="rwrap"><a className="rlink" href={b.url} target="_blank" rel="noreferrer" style={{ color: storeAccent(s) }}>{parseTitle(b.title).short.replace(/^Competitive Mystery Shop,?\s*/i, "")}</a>{del(b)}</span>;
  });
  const shopsCol = shops.length > 0 ? (
    <div className="storecol" style={{ ["--accent" as string]: "var(--forest)" }}>
      <div className="storecol-h">Mystery shops</div>
      {shopLinks}
    </div>
  ) : null;
  const olderLabel = (b: Bookmark) => {
    const s = stores.find((x) => x.id === b.store_id); const { short } = parseTitle(b.title);
    if (!s || compact) return short;                      // on a store's own page the store name is a given
    const first = s.short_name.split(" ").pop()!;          // "BDC Rep Report" already says BDC
    return new RegExp(`\\b${first}\\b`, "i").test(short) ? short : `${s.short_name} ${short.charAt(0).toLowerCase()}${short.slice(1)}`;
  };
  return (
    <>
    <section className="card">
      <div className="cardhead"><h2>{hasCurrent && !compact ? `${MONTHS[mi]} reports` : "Reports"}</h2>{children}</div>
      <div className={`reports${hasCurrent ? " flat" : ""}`}>
        {group.length > 0 && (hasCurrent ? (
          <div className="storecol" style={{ ["--accent" as string]: "var(--forest)" }}>
            <div className="storecol-h">Group</div>
            {group.map((b) => <span key={b.id} className="rwrap"><a className="rlink" href={b.url} target="_blank" rel="noreferrer">{parseTitle(b.title).short}</a>{del(b)}</span>)}
          </div>
        ) : (
          <div>
            {group.map((b) => <span key={b.id} className="rwrap"><a className="feature" href={b.url} target="_blank" rel="noreferrer"><span className="k">Group</span><span className="t">{parseTitle(b.title).short}</span></a>{del(b)}</span>)}
          </div>
        ))}
        <div className="bystore">
          {stores.filter((s) => byStore.some((b) => b.store_id === s.id)).sort((a, b) => a.sort_order - b.sort_order).map((s) => (
            <div key={s.id} className="storecol" style={{ ["--accent" as string]: storeAccent(s) }}>
              <div className="storecol-h">{s.short_name}</div>
              {byStore.filter((b) => b.store_id === s.id).map((b) => <span key={b.id} className="rwrap"><a className="rlink" href={b.url} target="_blank" rel="noreferrer">{parseTitle(b.title).short}</a>{del(b)}</span>)}
            </div>
          ))}
          {!compact && shopsCol}
        </div>
      </div>
      {older.length > 0 && (
        <p className="older small">
          <span className="faint">Last month:</span>{" "}
          {older.map((b, i) => <span key={b.id}>{i > 0 && <span className="faint"> · </span>}<a href={b.url} target="_blank" rel="noreferrer">{olderLabel(b)}</a></span>)}
        </p>
      )}
    </section>
    {compact && shops.length > 0 && (
      <section className="card">
        <div className="cardhead"><h2>Mystery shops</h2></div>
        <div className="grid-chips" style={{ display: "grid", gap: 6 }}>{shopLinks}</div>
      </section>
    )}
    </>
  );
}
