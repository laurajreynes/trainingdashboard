import Link from "next/link";
import type { Store } from "@/lib/types";
import {
  getGoals, getGoalEntries, getAllRoster, getVisits, getWins, getCommitments, getPeople,
  getMonthPlans, getPlaybook, getPlaybookChecks, getInitiatives, getTodos, getBookmarks,
} from "@/lib/data";
import { monthPhase, paceGoal, PHASE_LABEL, type Phase, type GoalPace } from "@/lib/month";
import { fmtDate, monthName, daysFromToday, storeAccent } from "@/lib/fmt";
import { saveMonthPlan, togglePlaybook, addPlaybookItem, deletePlaybookItem } from "@/app/actions";

type Props = {
  store: Store | null;      // null = all stores (home page)
  family: Store[];          // stores in scope
  allStores: Store[];
  editor: boolean;
  phaseOverride?: string | null;
  basePath: string;         // for the preview links
};

export async function MonthPanel({ store, family, allStores, editor, phaseOverride, basePath }: Props) {
  const mi = monthPhase(phaseOverride);
  const ids = family.map((s) => s.id);
  const scoped = store !== null;

  const [goals, roster, visits, wins, commitments, people, plans, playbook, checks, initiatives, todos, bookmarks] = await Promise.all([
    getGoals(scoped ? { storeIds: ids } : {}),
    getAllRoster(),
    getVisits(scoped ? { storeIds: ids, limit: 400 } : { limit: 400 }),
    getWins(scoped ? { storeIds: ids, limit: 300 } : { limit: 300 }),
    getCommitments(scoped ? ids : undefined),
    getPeople(scoped ? ids : undefined),
    getMonthPlans([mi.month, mi.prevMonth, mi.nextMonth]),
    getPlaybook(),
    getPlaybookChecks(mi.month),
    getInitiatives(),
    getTodos(scoped ? { storeIds: ids } : {}),
    getBookmarks(scoped ? ids : undefined),
  ]);
  // Store scope: store goals plus goals on initiatives that include this store
  const initIdsHere = new Set(initiatives.filter((i) => !scoped || i.store_ids.some((x) => ids.includes(x))).map((i) => i.id));
  const allGoals = scoped ? [...goals, ...(await getGoals()).filter((g) => g.initiative_id && initIdsHere.has(g.initiative_id) && !goals.some((x) => x.id === g.id))] : goals;
  const entries = await getGoalEntries(allGoals.map((g) => g.id));
  const paces = allGoals.map((g) => paceGoal(g, entries, mi));

  const inRange = (d: string | null | undefined, a: string, b: string) => Boolean(d && d >= a && d <= b);
  const peopleIds = new Set(people.map((p) => p.id));
  const scopedRoster = roster.filter((r) => peopleIds.has(r.person_id));

  const stat = (a: string, b: string) => ({
    visits: visits.filter((v) => inRange(v.date, a, b)).length,
    trained: scopedRoster.filter((r) => (r.status === "trained" || r.status === "solid") && inRange(r.trained_on, a, b)).length,
    wins: wins.filter((w) => inRange(w.date, a, b)).length,
  });
  const lastMonth = stat(mi.prevStart, mi.prevEnd);
  const thisMonth = stat(mi.monthStart, mi.today);

  const planFor = (month: string) => plans.find((p) => p.month === month && (scoped ? p.store_id === store!.id : p.store_id === null));
  const plan = planFor(mi.month);
  const nextPlan = planFor(mi.nextMonth);
  const nextName = monthName(mi.nextMonth);
  const groupPlan = plans.find((p) => p.month === mi.month && p.store_id === null);
  const storeFocuses = !scoped ? allStores.filter((s) => !s.is_bdc).map((s) => ({ s, p: plans.find((p) => p.month === mi.month && p.store_id === s.id) })) : [];

  const items = playbook.filter((i) => i.phase === mi.phase && (i.store_id === null || (scoped && i.store_id === store!.id)));
  const needsPush = people.filter((p) => p.active && scopedRoster.some((r) => r.person_id === p.id && r.status === "needs_followup"));
  const slipping = commitments.filter((c) => c.status === "slipping" || c.status === "dropped");
  const monthWins = wins.filter((w) => inRange(w.date, mi.monthStart, mi.today));
  const stale = !scoped ? allStores.filter((s) => !s.is_bdc).map((s) => {
    const last = visits.find((v) => v.store_id === s.id);
    return { s, days: last ? -daysFromToday(last.date) : null };
  }).filter((x) => x.days === null || x.days >= 10) : [];

  const overdue = todos.filter((t) => t.due && t.due < mi.today);
  const reports = bookmarks.filter((b) => !b.initiative_id);
  const prevNotes = visits.filter((v) => v.private_notes && inRange(v.date, mi.prevStart, mi.prevEnd));
  const activeInits = initiatives.filter((i) => i.status === "active" && (!scoped || i.store_ids.some((x) => ids.includes(x))));
  const focusStores = scoped ? [store!] : allStores.filter((s) => !s.is_bdc);
  const initFocus = focusStores.map((s) => {
    const fam = [s, ...allStores.filter((b) => b.shows_under.includes(s.slug))].map((x) => x.id);
    const here = new Set(people.filter((p) => p.active && fam.includes(p.store_id)).map((p) => p.id));
    const inits = activeInits.filter((i) => i.store_ids.includes(s.id)).map((i) => {
      const ros = roster.filter((r) => r.initiative_id === i.id && here.has(r.person_id));
      return { i, total: ros.length, untrained: ros.filter((r) => r.status === "not_started").length };
    });
    return { s, inits };
  }).filter((x) => x.inits.length);
  const storeLabel = (id: string | null) => allStores.find((s) => s.id === id)?.short_name || "";

  const mName = monthName(mi.month);
  const prevName = monthName(mi.prevMonth);

  return (
    <section className={`card phase phase-${mi.phase}`} style={{ marginBottom: 22 }}>
      <div className="phasehead">
        <div>
          <div className="eyebrow">{mName} · day {mi.day} of {mi.daysInMonth}</div>
          <h2 className="phasetitle">{PHASE_LABEL[mi.phase]}</h2>
        </div>
        <div className="phaseside">
          <MonthTrack day={mi.day} total={mi.daysInMonth} />
          <div className="phasepreview small faint">
            Preview:{" "}
            {(["reflect", "track", "close"] as Phase[]).map((p) => (
              <Link key={p} href={p === monthPhase(null).phase ? basePath : `${basePath}?phase=${p}`} className={p === mi.phase ? "on" : ""}>{PHASE_LABEL[p]}</Link>
            ))}
          </div>
        </div>
      </div>

      {mi.phase === "reflect" && (
        <div className="grid cols-3" style={{ marginTop: 14 }}>
          <div>
            <h4 className="minihead">{prevName} in numbers</h4>
            <div className="stats tight">
              <Stat v={lastMonth.visits} l="visits" />
              <Stat v={lastMonth.trained} l="trained" />
              <Stat v={lastMonth.wins} l="wins" />
            </div>
            <GoalFinals paces={paces} />
            {prevNotes.length > 0 && (
              <details className="quiet">
                <summary>Trainer notes from {prevName} ({prevNotes.length})</summary>
                <ul className="list" style={{ marginTop: 8 }}>
                  {prevNotes.map((v) => <li key={v.id}><div className="grow small"><Link href={`/v/${v.id}`}><strong>{fmtDate(v.date)}{!scoped || family.length > 1 ? ` ${storeLabel(v.store_id)}` : ""}</strong></Link><div className="muted pre">{v.private_notes}</div></div></li>)}
                </ul>
              </details>
            )}
          </div>
          <PlanBox
            title={`What we learned in ${prevName}`} field="lessons" value={plan?.lessons || null}
            month={mi.month} storeId={store?.id || null} editor={editor}
            placeholder={"What worked, what didn't, what surprised us"}
          />
          <PlanBox
            title={`${mName} focus`} field="focus" value={plan?.focus || null}
            month={mi.month} storeId={store?.id || null} editor={editor}
            placeholder={"One or two behaviors we're driving this month"}
            extra={<>
              {!scoped ? <StoreFocusList rows={storeFocuses} /> : groupPlan?.focus ? <p className="faint small" style={{ marginTop: 8 }}>Group focus: {groupPlan.focus}</p> : null}
              <InitFocus rows={initFocus} showStore={!scoped} />
            </>}
          />
        </div>
      )}

      {mi.phase === "track" && (
        <div className="grid cols-3" style={{ marginTop: 14 }}>
          <div>
            <h4 className="minihead">{mName} so far</h4>
            <div className="stats tight">
              <Stat v={thisMonth.visits} l="visits" sub={`${lastMonth.visits} last mo`} />
              <Stat v={thisMonth.trained} l="trained" sub={`${lastMonth.trained} last mo`} />
              <Stat v={thisMonth.wins} l="wins" sub={`${lastMonth.wins} last mo`} />
            </div>
            <FocusLine plan={plan} groupPlan={scoped ? groupPlan : undefined} />
          </div>
          <div>
            <h4 className="minihead">Pace to goal</h4>
            <PaceList paces={paces} mode="track" />
          </div>
          <div>
            <h4 className="minihead">Needs attention</h4>
            <ul className="list">
              {slipping.map((c) => <li key={c.id}><span className={`tag ${c.status === "dropped" ? "bad" : "warn"}`}>{c.status}</span><div className="grow small"><strong>{c.owner}</strong> · {c.text}</div></li>)}
              {stale.map(({ s, days }) => <li key={s.id}><span className="tag">visit</span><div className="grow small"><Link href={`/s/${s.slug}`}>{s.short_name}</Link> {days === null ? "hasn't had a visit logged" : `last visit ${days} days ago`}</div></li>)}
              {needsPush.length > 0 && <li><span className="tag warn">coach</span><div className="grow small">{needsPush.slice(0, 6).map((p, i) => <span key={p.id}>{i ? ", " : ""}<Link href={`/p/${p.id}`}>{p.name}</Link></span>)}{needsPush.length > 6 ? ` +${needsPush.length - 6}` : ""} marked follow up</div></li>}
              {overdue.slice(0, 5).map((t) => <li key={t.id}><span className="tag bad">overdue</span><div className="grow small">{t.text}<div className="meta">{!scoped || family.length > 1 ? `${storeLabel(t.store_id) || "General"} · ` : ""}due {fmtDate(t.due!)}</div></div></li>)}
              {overdue.length > 5 && <li className="small faint"><Link href="/todos">{overdue.length - 5} more overdue</Link></li>}
              {!slipping.length && !stale.length && !needsPush.length && !overdue.length && <li className="empty">Nothing flagged. Either it&apos;s going well or nothing&apos;s been checked.</li>}
            </ul>
          </div>
        </div>
      )}

      {mi.phase === "close" && (
        <div className="grid cols-3" style={{ marginTop: 14 }}>
          <div>
            <div className="bigcount">{mi.daysLeft}<span>{mi.daysLeft === 1 ? "day left" : "days left"}</span></div>
            <p className="muted small">Month ends {fmtDate(mi.monthEnd, { weekday: true })}</p>
            <FocusLine plan={plan} groupPlan={scoped ? groupPlan : undefined} />
            <h4 className="minihead" style={{ marginTop: 14 }}>Wins this month · {monthWins.length}</h4>
            <ul className="list">
              {monthWins.slice(0, 4).map((w) => <li key={w.id}><span style={{ color: "var(--gold)" }}>★</span><div className="grow small">{w.text}</div></li>)}
              {!monthWins.length && <li className="empty">Log the first one</li>}
            </ul>
          </div>
          <div>
            <h4 className="minihead">Gap to goal</h4>
            <PaceList paces={paces} mode="close" />
            {reports.length > 0 && (
              <>
                <h4 className="minihead" style={{ marginTop: 14 }}>Boards and reports</h4>
                <div className="bookmarks">
                  {reports.map((b) => <a key={b.id} className="bookmark" href={b.url} target="_blank" rel="noreferrer"><span className="k">{b.store_id ? storeLabel(b.store_id) : "all"}</span>{b.title}</a>)}
                </div>
              </>
            )}
          </div>
          <div>
            <h4 className="minihead">Who needs a push</h4>
            {needsPush.length ? (
              <div className="chips">{needsPush.map((p) => <Link key={p.id} href={`/p/${p.id}`} className="chip">{p.name}</Link>)}</div>
            ) : <p className="empty">No one marked follow up</p>}
            {slipping.length > 0 && <p className="small" style={{ marginTop: 10 }}><span className="tag warn">{slipping.length}</span> manager commitment{slipping.length === 1 ? "" : "s"} slipping</p>}
          </div>
        </div>
      )}

      {mi.phase === "close" && (editor || nextPlan?.focus || nextPlan?.lessons) && (
        <details className="quiet" open={Boolean(nextPlan?.focus || nextPlan?.lessons)} style={{ marginTop: 14 }}>
          <summary>Set up {nextName}{nextPlan?.focus ? " · focus written" : ""}</summary>
          <div className="grid cols-2" style={{ marginTop: 10 }}>
            <PlanBox
              title={`What ${mName} taught us`} field="lessons" value={nextPlan?.lessons || null}
              month={mi.nextMonth} storeId={store?.id || null} editor={editor}
              placeholder={"What worked, what didn't, what surprised us"}
            />
            <PlanBox
              title={`${nextName} focus`} field="focus" value={nextPlan?.focus || null}
              month={mi.nextMonth} storeId={store?.id || null} editor={editor}
              placeholder={"One or two behaviors we're driving next month"}
            />
          </div>
        </details>
      )}

      <Playbook
        items={items} checks={checks} month={mi.month} phase={mi.phase} editor={editor}
        store={store} scopeStores={scoped ? [store!] : allStores.filter((s) => !s.is_bdc)}
      />
    </section>
  );
}

function MonthTrack({ day, total }: { day: number; total: number }) {
  const seg = (a: number, b: number) => ({ left: `${((a - 1) / total) * 100}%`, width: `${((b - a + 1) / total) * 100}%` });
  return (
    <div className="monthtrack" aria-label={`Day ${day} of ${total}`}>
      <span className="seg reflect" style={seg(1, 3)} />
      <span className="seg track" style={seg(4, 20)} />
      <span className="seg close" style={seg(21, total)} />
      <span className="marker" style={{ left: `${((day - 0.5) / total) * 100}%` }} />
    </div>
  );
}

function Stat({ v, l, sub }: { v: number; l: string; sub?: string }) {
  return <div className="stat"><div className="v">{v}</div><div className="l">{l}</div>{sub && <div className="faint" style={{ fontSize: 11, marginTop: 2 }}>{sub}</div>}</div>;
}

function fmtVal(n: number | null, unit: string) {
  if (n === null) return "–";
  return unit === "%" ? `${n}%` : `${n}${unit && unit !== "#" ? " " + unit : ""}`;
}

function GoalFinals({ paces }: { paces: GoalPace[] }) {
  const withPrev = paces.filter((p) => p.lastMonth !== null);
  if (!withPrev.length) return <p className="faint small" style={{ marginTop: 10 }}>No goal numbers logged last month</p>;
  return (
    <ul className="list" style={{ marginTop: 10 }}>
      {withPrev.map((p) => {
        const t = p.goal.target === null ? null : Number(p.goal.target);
        const hit = t !== null && (p.goal.direction === "up" ? p.lastMonth! >= t : p.lastMonth! <= t);
        return (
          <li key={p.goal.id} className="small">
            <div className="grow">{p.goal.name}</div>
            <strong>{fmtVal(p.lastMonth, p.goal.unit)}</strong>
            {t !== null && <span className={`tag ${hit ? "good" : "warn"}`}>{hit ? "hit" : `goal ${fmtVal(t, p.goal.unit)}`}</span>}
          </li>
        );
      })}
    </ul>
  );
}

function PaceList({ paces, mode }: { paces: GoalPace[]; mode: "track" | "close" }) {
  if (!paces.length) return <p className="empty">No goals set. Add one on an initiative or store.</p>;
  return (
    <ul className="list">
      {paces.map((p) => {
        const u = p.goal.unit;
        const cls = p.status === "hit" ? "good" : p.status === "on_pace" ? "gold" : p.status === "behind" ? "warn" : "";
        const label = p.status === "hit" ? "hit" : p.status === "on_pace" ? "on pace" : p.status === "behind" ? "behind" : "no data";
        let detail = "";
        if (p.current === null) detail = "Nothing logged this month";
        else if (p.goal.kind === "count") {
          detail = mode === "close" && p.gap !== null && p.gap > 0
            ? `Need ${p.gap} more · ${p.perDay}/day`
            : `${fmtVal(p.current, u)} so far · pacing ${fmtVal(p.projected, u)}`;
        } else {
          detail = `${fmtVal(p.current, u)}${p.lastMonth !== null ? ` · ${fmtVal(p.lastMonth, u)} last mo` : ""}`;
        }
        return (
          <li key={p.goal.id} className="small">
            <div className="grow">
              <div>{p.goal.name}{p.goal.target !== null && <span className="faint"> · goal {fmtVal(Number(p.goal.target), u)}</span>}</div>
              <div className="meta">{detail}{p.asOf ? ` · as of ${fmtDate(p.asOf)}` : ""}</div>
            </div>
            <span className={`tag ${cls}`}>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}

function FocusLine({ plan, groupPlan }: { plan?: { focus: string | null }; groupPlan?: { focus: string | null } }) {
  const f = plan?.focus || groupPlan?.focus;
  if (!f) return <p className="faint small" style={{ marginTop: 10 }}>No focus set for this month</p>;
  return <div className="focusline"><span className="eyebrow">This month&apos;s focus</span><p className="pre">{f}</p></div>;
}

function StoreFocusList({ rows }: { rows: { s: Store; p?: { focus: string | null } }[] }) {
  const set = rows.filter((r) => r.p?.focus);
  if (!set.length) return null;
  return (
    <ul className="list" style={{ marginTop: 10 }}>
      {set.map(({ s, p }) => <li key={s.id} className="small"><strong style={{ color: storeAccent(s), minWidth: 74 }}>{s.short_name}</strong><div className="grow muted">{p!.focus}</div></li>)}
    </ul>
  );
}

function InitFocus({ rows, showStore }: { rows: { s: Store; inits: { i: { id: string; name: string }; total: number; untrained: number }[] }[]; showStore: boolean }) {
  if (!rows.length) return <p className="faint small" style={{ marginTop: 10 }}>No active initiatives. <Link href="/initiatives">Pick this month&apos;s one or two behaviors.</Link></p>;
  return (
    <div style={{ marginTop: 12 }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>Active initiatives</div>
      {rows.map(({ s, inits }) => (
        <div key={s.id} style={{ marginBottom: 6 }} className="small">
          {showStore && <strong style={{ color: storeAccent(s) }}>{s.short_name} </strong>}
          {inits.map(({ i, total, untrained }, n) => (
            <span key={i.id}>{n ? " · " : ""}<Link href={`/i/${i.id}?store=${s.slug}`}>{i.name}</Link><span className="faint">{untrained ? ` (${untrained} to train)` : total ? " (all trained)" : " (no roster)"}</span></span>
          ))}
        </div>
      ))}
    </div>
  );
}

function PlanBox({ title, field, value, month, storeId, editor, placeholder, extra }: {
  title: string; field: "lessons" | "focus"; value: string | null; month: string; storeId: string | null;
  editor: boolean; placeholder: string; extra?: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="minihead">{title}</h4>
      {editor ? (
        <form action={saveMonthPlan}>
          <input type="hidden" name="month" value={month} />
          {storeId && <input type="hidden" name="store_id" value={storeId} />}
          <textarea name={field} defaultValue={value || ""} placeholder={placeholder} style={{ minHeight: 96 }} />
          <button className="btn sm ghost" style={{ marginTop: 6 }}>Save</button>
        </form>
      ) : value ? <p className="pre">{value}</p> : <p className="empty">Not written yet</p>}
      {extra}
    </div>
  );
}

function Playbook({ items, checks, month, phase, editor, store, scopeStores }: {
  items: { id: string; text: string; store_id: string | null }[];
  checks: { item_id: string; store_id: string }[];
  month: string; phase: Phase; editor: boolean; store: Store | null; scopeStores: Store[];
}) {
  const title = phase === "reflect" ? "Start-of-month list" : phase === "track" ? "Mid-month list" : "Close-out list";
  return (
    <details className="quiet" open={phase === "close" || Boolean(store)}>
      <summary>{title} · {store ? `${checks.filter((c) => c.store_id === store.id && items.some((i) => i.id === c.item_id)).length} of ${items.length} done` : "by store"}</summary>
      {store ? (
        <ul className="list" style={{ marginTop: 10 }}>
          {items.map((i) => {
            const on = checks.some((c) => c.item_id === i.id && c.store_id === store.id);
            return (
              <li key={i.id}>
                {editor ? (
                  <form action={togglePlaybook}>
                    <input type="hidden" name="item_id" value={i.id} />
                    <input type="hidden" name="store_id" value={store.id} />
                    <input type="hidden" name="month" value={month} />
                    <input type="hidden" name="checked" value={on ? "true" : "false"} />
                    <button className={`checkbtn ${on ? "done" : ""}`}>{on ? "✓" : ""}</button>
                  </form>
                ) : <span className={`checkbtn ${on ? "done" : ""}`} style={{ cursor: "default" }}>{on ? "✓" : ""}</span>}
                <div className={`grow small ${on ? "done-text" : ""}`}>{i.text}{i.store_id && <span className="faint"> · this store only</span>}</div>
                {editor && <form action={deletePlaybookItem}><input type="hidden" name="id" value={i.id} /><button className="iconbtn" title="Remove from list for every month">×</button></form>}
              </li>
            );
          })}
          {!items.length && <li className="empty">No items for this part of the month</li>}
        </ul>
      ) : (
        <table className="tbl" style={{ marginTop: 10 }}>
          <thead><tr><th>Item</th>{scopeStores.map((s) => <th key={s.id} style={{ textAlign: "center" }}>{s.short_name}</th>)}</tr></thead>
          <tbody>
            {items.filter((i) => i.store_id === null).map((i) => (
              <tr key={i.id}>
                <td className="small">{i.text}</td>
                {scopeStores.map((s) => {
                  const on = checks.some((c) => c.item_id === i.id && c.store_id === s.id);
                  return <td key={s.id} style={{ textAlign: "center", color: on ? "var(--good)" : "var(--ink-faint)" }}>{on ? "✓" : "·"}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editor && (
        <form action={addPlaybookItem} className="inline" style={{ marginTop: 10 }}>
          <input type="hidden" name="phase" value={phase} />
          <input type="text" name="text" placeholder={`Add to the ${title.toLowerCase()}`} required style={{ flex: 1, minWidth: 180 }} />
          {store && (
            <select name="store_id" style={{ width: "auto" }}>
              <option value="">Every store</option>
              <option value={store.id}>{store.short_name} only</option>
            </select>
          )}
          <button className="btn sm">Add</button>
        </form>
      )}
    </details>
  );
}
