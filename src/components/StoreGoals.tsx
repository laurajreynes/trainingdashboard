import type { Goal, GoalEntry, Store } from "@/lib/types";
import { Sparkline } from "@/components/ui";
import { addGoal, addGoalEntry } from "@/app/actions";
import { today } from "@/lib/fmt";

/** Store goals in one place: the current rates up top, the trend for each below, logging and adding for the editor. */
export function StoreGoals({ store, goals, entries, editor }: { store: Store; goals: Goal[]; entries: GoalEntry[]; editor: boolean }) {
  if (!goals.length && !editor) return null;
  const rates = goals.filter((g) => g.kind === "rate");
  const latest = (g: Goal) => entries.filter((e) => e.goal_id === g.id).sort((a, b) => a.date.localeCompare(b.date)).pop();
  return (
    <section className="card">
      <div className="cardhead"><h2>Store goals</h2></div>
      {rates.length > 0 && (
        <ul className="list" style={{ marginBottom: 10 }}>
          {rates.map((g) => { const last = latest(g); return (
            <li key={g.id} className="small"><div className="grow">{g.name}</div><strong>{last ? `${last.value}${g.unit}` : "–"}</strong>{g.target !== null && <span className="faint"> / {g.target}{g.unit}</span>}</li>
          ); })}
        </ul>
      )}
      {goals.length ? (
        <div className="goalgrid">
          {goals.map((g) => (
            <div key={g.id} className="card flat">
              <strong className="small">{g.name}</strong>
              <Sparkline goal={g} entries={entries} />
              {editor && (
                <form action={addGoalEntry} className="inline" style={{ marginTop: 6 }}>
                  <input type="hidden" name="goal_id" value={g.id} />
                  <input type="date" name="date" defaultValue={today()} style={{ width: 130 }} />
                  <input type="number" step="any" name="value" placeholder={g.unit} required style={{ width: 80 }} />
                  <button className="btn sm ghost">Log</button>
                </form>
              )}
            </div>
          ))}
        </div>
      ) : <p className="empty">No store-level goals yet.</p>}
      {editor && (
        <details className="adder" style={{ marginTop: 12 }}>
          <summary>Store goal</summary>
          <form action={addGoal} className="body">
            <input type="hidden" name="store_id" value={store.id} />
            <div className="frow">
              <input type="text" name="name" placeholder="Appointment set rate" required />
              <input type="number" step="any" name="target" placeholder="Target" />
              <input type="text" name="unit" placeholder="%" defaultValue="%" />
              <select name="direction"><option value="up">Higher is better</option><option value="down">Lower is better</option></select>
              <select name="kind"><option value="rate">Rate (%, per call)</option><option value="count">Count this month (appts, units)</option></select>
            </div>
            <button className="btn sm">Add goal</button>
          </form>
        </details>
      )}
    </section>
  );
}
