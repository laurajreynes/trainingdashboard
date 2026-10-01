import Link from "next/link";
import type { Initiative, InitiativePerson, Person, Store, Todo, Visit, Win, Commitment, GoalEntry, Goal } from "@/lib/types";
import { INITIATIVE_STATUS_LABEL, COMMITMENT_LABEL } from "@/lib/types";
import { fmtDate, relDay, pct, storeAccent, today } from "@/lib/fmt";
import { toggleTodo, deleteTodo, deleteWin, setCommitmentStatus, deleteCommitment } from "@/app/actions";

export function StatusTag({ status }: { status: Initiative["status"] }) {
  const cls = status === "active" ? "gold" : status === "sustaining" ? "good" : status === "planning" ? "info" : "";
  return <span className={`tag ${cls}`}>{INITIATIVE_STATUS_LABEL[status]}</span>;
}

export function rosterCounts(roster: InitiativePerson[]) {
  const c = { solid: 0, trained: 0, needs: 0, not: 0, total: roster.length };
  for (const r of roster) {
    if (r.status === "solid") c.solid++;
    else if (r.status === "trained") c.trained++;
    else if (r.status === "needs_followup") c.needs++;
    else c.not++;
  }
  return c;
}

export function RosterBar({ roster, showLegend = false }: { roster: InitiativePerson[]; showLegend?: boolean }) {
  const c = rosterCounts(roster);
  if (!c.total) return <p className="faint small" style={{ marginTop: 8 }}>No one on the roster yet</p>;
  return (
    <>
      <div className="progress" title={`${c.solid} solid, ${c.trained} trained, ${c.needs} follow up, ${c.not} not yet`}>
        <span className="solid" style={{ width: `${pct(c.solid, c.total)}%` }} />
        <span className="trained" style={{ width: `${pct(c.trained, c.total)}%` }} />
        <span className="needs" style={{ width: `${pct(c.needs, c.total)}%` }} />
      </div>
      <div className="legend">
        <span>{c.solid + c.trained} of {c.total} trained</span>
        {showLegend && (
          <>
            <span><i style={{ background: "var(--good)" }} />Solid {c.solid}</span>
            <span><i style={{ background: "var(--gold)" }} />Trained {c.trained}</span>
            <span><i style={{ background: "var(--warn)" }} />Follow up {c.needs}</span>
            <span><i style={{ background: "var(--line)" }} />Not yet {c.not}</span>
          </>
        )}
      </div>
    </>
  );
}

export function InitiativeCard({ init, roster, stores }: { init: Initiative; roster: InitiativePerson[]; stores: Store[] }) {
  const names = stores.filter((s) => init.store_ids.includes(s.id)).map((s) => s.short_name);
  return (
    <Link href={`/i/${init.id}`} className="initcard">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
        <h3>{init.name}</h3>
        <StatusTag status={init.status} />
      </div>
      {init.goal_text && <p className="muted small">{init.goal_text}</p>}
      {names.length > 0 && <p className="faint small">{names.join(" · ")}</p>}
      <RosterBar roster={roster} />
    </Link>
  );
}

export function TodoList({ todos, editor, stores, people, showStore = false }: {
  todos: Todo[]; editor: boolean; stores?: Store[]; people?: Person[]; showStore?: boolean;
}) {
  if (!todos.length) return <p className="empty">Nothing open</p>;
  const storeName = (id: string | null) => stores?.find((s) => s.id === id)?.short_name;
  const personName = (id: string | null) => people?.find((p) => p.id === id)?.name;
  return (
    <ul className="list">
      {todos.map((t) => {
        const overdue = t.due && !t.done && relDay(t.due).endsWith("ago");
        return (
          <li key={t.id}>
            {editor ? (
              <form action={toggleTodo}>
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="done" value={t.done ? "false" : "true"} />
                <button type="submit" className={`checkbtn ${t.done ? "done" : ""}`} title={t.done ? "Reopen" : "Mark done"}>{t.done ? "✓" : ""}</button>
              </form>
            ) : (
              <span className={`checkbtn ${t.done ? "done" : ""}`} style={{ cursor: "default" }}>{t.done ? "✓" : ""}</span>
            )}
            <div className="grow">
              <div className={t.done ? "done-text" : ""}>{t.text}</div>
              <div className="meta">
                {[
                  showStore && storeName(t.store_id) ? <span key="s">{storeName(t.store_id)}</span> : null,
                  t.person_id && personName(t.person_id) ? <Link key="p" href={`/p/${t.person_id}`}>{personName(t.person_id)}</Link> : null,
                  t.due ? <span key="d" style={overdue ? { color: "var(--bad)" } : undefined}>Due {fmtDate(t.due)} ({relDay(t.due)})</span> : null,
                  t.visit_id ? <Link key="v" href={`/v/${t.visit_id}`}>from visit</Link> : null,
                ].filter(Boolean).map((el, i) => <span key={i}>{i > 0 ? " · " : ""}{el}</span>)}
              </div>
            </div>
            {editor && (
              <form action={deleteTodo}><input type="hidden" name="id" value={t.id} /><button className="iconbtn" title="Delete">×</button></form>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function VisitList({ visits, stores, people, showStore = false }: { visits: Visit[]; stores?: Store[]; people?: Person[]; showStore?: boolean }) {
  if (!visits.length) return <p className="empty">No visits logged yet</p>;
  return (
    <ul className="list">
      {visits.map((v) => {
        const st = stores?.find((s) => s.id === v.store_id);
        return (
          <li key={v.id}>
            <span className="dot" style={{ ["--accent" as string]: storeAccent(st) }} />
            <div className="grow">
              <Link href={`/v/${v.id}`}><strong>{fmtDate(v.date, { weekday: true })}</strong>{showStore && st ? ` · ${st.short_name}` : ""}{v.focus ? ` · ${v.focus}` : ""}</Link>
              {(v.people_ids.length > 0 || v.date > today()) && (
                <div className="faint small" style={{ marginTop: 2 }}>
                  {v.date > today() ? "Scheduled" : `${v.people_ids.length} trained`}
                  {people && v.people_ids.length > 0 && v.people_ids.length <= 4 ? `: ${v.people_ids.map((id) => people.find((p) => p.id === id)?.name).filter(Boolean).join(", ")}` : ""}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function WinList({ wins, editor, people, stores, showStore = false }: { wins: Win[]; editor: boolean; people?: Person[]; stores?: Store[]; showStore?: boolean }) {
  if (!wins.length) return <p className="empty">No wins logged yet. Log the first one.</p>;
  return (
    <ul className="list">
      {wins.map((w) => {
        const p = people?.find((x) => x.id === w.person_id);
        const st = stores?.find((x) => x.id === w.store_id);
        return (
          <li key={w.id}>
            <span style={{ color: "var(--gold)", flex: "none" }}>★</span>
            <div className="grow">
              <div>{w.text}</div>
              <div className="meta">{fmtDate(w.date)}{showStore && st ? ` · ${st.short_name}` : ""}{p ? <> · <Link href={`/p/${p.id}`}>{p.name}</Link></> : null}</div>
            </div>
            {editor && <form action={deleteWin}><input type="hidden" name="id" value={w.id} /><button className="iconbtn">×</button></form>}
          </li>
        );
      })}
    </ul>
  );
}

export function CommitmentList({ items, editor }: { items: Commitment[]; editor: boolean }) {
  if (!items.length) return <p className="empty">No manager commitments tracked yet</p>;
  const cls = (s: Commitment["status"]) => s === "on_track" ? "good" : s === "slipping" ? "warn" : s === "dropped" ? "bad" : "";
  return (
    <ul className="list">
      {items.map((c) => (
        <li key={c.id}>
          <div className="grow">
            <div><strong>{c.owner}</strong> · {c.text}</div>
            <div className="meta">{c.checked_at ? `Checked ${fmtDate(c.checked_at)}` : "Not checked yet"}{c.notes ? ` · ${c.notes}` : ""}</div>
          </div>
          {editor ? (
            <form action={setCommitmentStatus} className="inline" key={`${c.status}|${c.checked_at}|${c.notes}`}>
              <input type="hidden" name="id" value={c.id} />
              <select name="status" defaultValue={c.status} style={{ width: "auto", padding: "3px 6px", fontSize: 12 }}>
                {(Object.keys(COMMITMENT_LABEL) as Commitment["status"][]).map((k) => <option key={k} value={k}>{COMMITMENT_LABEL[k]}</option>)}
              </select>
              <button className="btn sm ghost">Save</button>
            </form>
          ) : (
            <span className={`tag ${cls(c.status)}`}>{COMMITMENT_LABEL[c.status]}</span>
          )}
          {editor && <form action={deleteCommitment}><input type="hidden" name="id" value={c.id} /><button className="iconbtn">×</button></form>}
        </li>
      ))}
    </ul>
  );
}

export function Sparkline({ goal, entries }: { goal: Goal; entries: GoalEntry[] }) {
  const pts = entries.filter((e) => e.goal_id === goal.id);
  const W = 300, H = 56, P = 6;
  if (pts.length < 2) {
    const last = pts[0];
    return <p className="small muted">{last ? `${last.value}${goal.unit} on ${fmtDate(last.date)}` : "No entries yet"}{goal.target !== null ? ` · target ${goal.target}${goal.unit}` : ""}</p>;
  }
  const vals = pts.map((p) => Number(p.value));
  const all = goal.target !== null ? [...vals, Number(goal.target)] : vals;
  const min = Math.min(...all), max = Math.max(...all);
  const y = (v: number) => max === min ? H / 2 : P + (H - 2 * P) * (1 - (v - min) / (max - min));
  const x = (i: number) => P + (W - 2 * P) * (i / (pts.length - 1));
  const d = vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = vals[vals.length - 1];
  const hit = goal.target !== null && (goal.direction === "up" ? last >= Number(goal.target) : last <= Number(goal.target));
  return (
    <div>
      <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-label={`${goal.name} trend`}>
        {goal.target !== null && <line x1={P} x2={W - P} y1={y(Number(goal.target))} y2={y(Number(goal.target))} stroke="var(--ink-faint)" strokeDasharray="4 4" strokeWidth="1" />}
        <path d={d} fill="none" stroke={hit ? "var(--good)" : "var(--gold)"} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(pts.length - 1)} cy={y(last)} r="3" fill={hit ? "var(--good)" : "var(--gold)"} />
      </svg>
      <p className="small muted">Latest {last}{goal.unit} on {fmtDate(pts[pts.length - 1].date)}{goal.target !== null ? ` · target ${goal.target}${goal.unit}` : ""}{hit ? " · hit" : ""}</p>
    </div>
  );
}
