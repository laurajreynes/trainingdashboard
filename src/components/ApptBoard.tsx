import { HBars } from "@/components/charts";
import type { Board } from "@/lib/board";

const sum = (rows: { set: number; shown: number }[]) => rows.reduce((a, r) => ({ set: a.set + r.set, shown: a.shown + r.shown }), { set: 0, shown: 0 });

/** Appointments set and shown from the showroom board: month to date, this week, and by salesperson. */
export function ApptBoardCard({ board, url, color, title }: { board: Board; url: string | null; color: string; title: string }) {
  const m = sum(board.mtd.rows), w = sum(board.week.rows);
  const pct = m.set ? Math.round((m.shown / m.set) * 100) : 0;
  return (
    <section className="card">
      <div className="cardhead"><h2>{title}</h2>{url && <a className="more" href={url} target="_blank" rel="noreferrer">Board</a>}</div>
      <HBars rows={[
        { label: "Set", value: m.set, color: "var(--line-strong)" },
        { label: "Shown", value: m.shown, color, sub: `${pct}%` },
      ]} max={Math.max(m.set, 1)} />
      <p className="small faint" style={{ marginTop: 6 }}>This week {w.set} set, {w.shown} shown · from DriveCentric{board.updatedAt ? `, ${new Date(board.updatedAt).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Denver" })}` : ""}</p>
    </section>
  );
}

export function ApptPeopleCard({ board, color, title, url }: { board: Board; color: string; title: string; url?: string | null }) {
  const rows = [...board.mtd.rows].sort((a, b) => b.set - a.set || b.shown - a.shown);
  const top = Math.max(1, ...rows.map((r) => r.set));
  const bar = (r: typeof rows[number]) => ({ label: r.name, value: r.set, color, sub: r.set ? `${r.shown} shown` : "" });
  return (
    <section className="card">
      <div className="cardhead"><h2>{title}</h2>{url && <a className="more" href={url} target="_blank" rel="noreferrer">Board</a>}</div>
      <HBars rows={rows.slice(0, 3).map(bar)} max={top} />
      {rows.length > 3 && (
        <details className="quiet" style={{ marginTop: 8 }}>
          <summary className="small">Everyone ({rows.length})</summary>
          <div style={{ marginTop: 8 }}><HBars rows={rows.slice(3).map(bar)} max={top} /></div>
        </details>
      )}
    </section>
  );
}
