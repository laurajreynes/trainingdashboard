import Link from "next/link";
import { redirect } from "next/navigation";
import { isEditor } from "@/lib/auth";
import { getStores, getMetrics } from "@/lib/data";
import { fmtDate, today, monthsBack, monthName } from "@/lib/fmt";
import { importMetrics, deleteMetric } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ ok?: string; skipped?: string }> }) {
  if (!(await isEditor())) redirect("/login?next=/import");
  const sp = await searchParams;
  const [stores, metrics] = await Promise.all([getStores(), getMetrics()]);
  const storeName = (id: string) => stores.find((s) => s.id === id)?.short_name || "";
  const periods = [...new Set(metrics.map((m) => m.period))].sort().reverse();
  const cur = today().slice(0, 7);

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Store results</div>
          <h1>Import from the Performance Report</h1>
          <div className="sub small">Paste the Inputs tab from the Bozeman PR spreadsheet. Sold, appointments, phone ups, and web ups land on every dashboard.</div>
        </div>
      </div>

      {sp.ok && <div className="notice" style={{ marginBottom: 14 }}>Imported {sp.ok} store row{sp.ok === "1" ? "" : "s"}.{sp.skipped ? ` Skipped: ${sp.skipped}.` : ""}</div>}

      <div className="grid main-side">
        <section className="card">
          <form action={importMetrics}>
            <div className="frow">
              <label className="f">Month
                <select name="period" defaultValue={cur}>
                  {monthsBack(6).reverse().map((m) => <option key={m} value={m}>{monthName(m)} {m.slice(0, 4)}</option>)}
                </select>
              </label>
              <label className="f">Numbers are through<input type="date" name="as_of" defaultValue={today()} required /></label>
              <label className="f">Source<input type="text" name="source" defaultValue="Performance Report" /></label>
            </div>
            <label className="f">Paste the Inputs tab
              <textarea name="data" required style={{ minHeight: 220, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12 }}
                placeholder={"Store\tShowroom / Lot Ups\tPhone Ups In\tWeb Ups In\t…\tTotal Sold F&I\t…\nChevrolet\t94\t134\t129\t…\t129\t…\nToyota\t174\t166\t195\t…\t177\t…"} />
            </label>
            <p className="faint small" style={{ margin: "6px 0 10px" }}>
              In Google Sheets: open the <strong>Inputs</strong> tab, click cell A1, drag down to the last store row (through BDC (shared)) and across to the last column, copy, paste here. The header row is what tells me which column is which. Danhof and Belgrade roll up under Chevrolet.
            </p>
            <button className="btn gold">Import</button>
          </form>
        </section>

        <section className="card">
          <div className="cardhead"><h2>What&apos;s loaded</h2></div>
          {periods.length ? periods.map((p) => (
            <div key={p} style={{ marginBottom: 12 }}>
              <div className="eyebrow">{monthName(p)} {p.slice(0, 4)}</div>
              <table className="tbl">
                <thead><tr><th>Store</th><th className="num">Sold</th><th>Through</th><th /></tr></thead>
                <tbody>
                  {metrics.filter((m) => m.period === p).sort((a, b) => b.sold - a.sold).map((m) => (
                    <tr key={m.id}>
                      <td>{storeName(m.store_id)}{m.location ? <span className="faint"> · {m.location}</span> : ""}</td>
                      <td className="num">{m.sold}</td>
                      <td className="small muted">{fmtDate(m.as_of)}</td>
                      <td><form action={deleteMetric}><input type="hidden" name="id" value={m.id} /><button className="iconbtn">×</button></form></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )) : <p className="empty">Nothing imported yet</p>}
          <p className="faint small"><Link href="/">Back to the dashboard</Link></p>
        </section>
      </div>
    </>
  );
}
