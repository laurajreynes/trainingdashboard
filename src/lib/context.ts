import "server-only";
import { getHubSnapshot, getMonthPlans, getStorePosts, getExamples, getMetrics, getGroupNotes, getMeetings } from "./data";
import { ROSTER_LABEL, INITIATIVE_STATUS_LABEL, COMMITMENT_LABEL } from "./types";
import { today, addDays, monthsBack, nextGmMeeting, projectToMonthEnd } from "./fmt";
import { monthPhase, paceGoal } from "./month";

/** Plain-text picture of the whole hub, for the assistant and the recap. */
export async function buildHubContext(): Promise<string> {
  const snap = await getHubSnapshot();
  const storeName = (id: string | null) => snap.stores.find((s) => s.id === id)?.short_name || "General";
  const personName = (id: string | null) => snap.people.find((p) => p.id === id)?.name || "";
  const initName = (id: string | null) => snap.initiatives.find((i) => i.id === id)?.name || "";
  const out: string[] = [];

  const mi = monthPhase();
  const plans = await getMonthPlans([mi.month, mi.prevMonth]);
  out.push("# WHERE WE ARE IN THE MONTH");
  out.push(`Today ${mi.today}, day ${mi.day} of ${mi.daysInMonth}, ${mi.daysLeft} days left including today. Phase: ${mi.phase} (reflect = days 1-3, looking back and setting focus; track = days 4-20, pacing against goals; close = day 21 to month end, pushing to finish).`);
  for (const p of plans) {
    out.push(`- ${p.month} ${p.store_id ? storeName(p.store_id) : "Group-wide"}${p.lessons ? ` | lessons from prior month: ${p.lessons}` : ""}${p.focus ? ` | focus: ${p.focus}` : ""}`);
  }
  const paces = snap.goals.map((g) => paceGoal(g, snap.entries, mi)).filter((p) => p.current !== null);
  if (paces.length) {
    out.push("Goal pace this month:");
    for (const p of paces) {
      out.push(`- ${p.goal.name} (${p.goal.initiative_id ? initName(p.goal.initiative_id) : storeName(p.goal.store_id)}, ${p.goal.kind}): ${p.current}${p.goal.unit} as of ${p.asOf}${p.projected !== null ? `, projecting ${p.projected}` : ""}${p.goal.target !== null ? `, target ${p.goal.target}` : ""}, status ${p.status}${p.perDay ? `, needs ${p.perDay}/day` : ""}`);
    }
  }

  const [gnotes, meetings, metrics] = await Promise.all([getGroupNotes(), getMeetings(6), getMetrics({ periods: monthsBack(3) })]);
  out.push("\n# GROUP FOCUS");
  for (const k of ["mission", "vision", "values", "notes"]) { const b = gnotes.find((n) => n.key === k)?.body; if (b) out.push(`${k}: ${b}`); }
  out.push(`Next GM meeting (second Thursday): ${nextGmMeeting()}`);
  for (const m of meetings) out.push(`- Meeting ${m.date} ${m.title}${m.agenda ? ` | agenda: ${m.agenda}` : ""}${m.notes ? ` | notes: ${m.notes}` : ""}`);

  out.push("\n# STORE RESULTS (from the DriveCentric Performance Report; month-to-date through as_of)");
  if (metrics.length) for (const m of metrics) {
    out.push(`- ${m.period} ${storeName(m.store_id)}${m.location ? "/" + m.location : ""} thru ${m.as_of}: sold ${m.sold} (pacing ${projectToMonthEnd(m.sold, m.as_of)})${m.new_sold != null ? `, new ${m.new_sold}` : ""}${m.used_sold != null ? `, used ${m.used_sold}` : ""}${m.appts_due != null ? `, appts due ${m.appts_due} shown ${m.appts_shown ?? "?"} sold ${m.appts_sold ?? "?"}` : ""}${m.phone_ups != null ? `, phone ups ${m.phone_ups}` : ""}${m.web_ups != null ? `, web ups ${m.web_ups}` : ""}${m.lot_ups != null ? `, lot ups ${m.lot_ups}` : ""}${m.write_ups != null ? `, write ups ${m.write_ups}` : ""}${m.outbound_calls != null ? `, outbound calls ${m.outbound_calls}` : ""}`);
  } else out.push("none imported yet");

  out.push("\n# STORES");
  for (const s of snap.stores) {
    const folks = snap.people.filter((p) => p.store_id === s.id && p.active);
    out.push(`- ${s.name} (${s.short_name})${s.is_bdc ? ` [shared BDC under ${s.shows_under.join(", ")}]` : ""}${s.locations.length ? ` locations: ${s.locations.join(", ")}` : ""}; ${folks.length} active people`);
  }

  out.push("\n# INITIATIVES");
  for (const i of snap.initiatives) {
    const ros = snap.roster.filter((r) => r.initiative_id === i.id);
    const counts = Object.fromEntries(Object.keys(ROSTER_LABEL).map((k) => [k, ros.filter((r) => r.status === k).length]));
    out.push(`## ${i.name} [${INITIATIVE_STATUS_LABEL[i.status]}] stores: ${i.store_ids.map(storeName).join(", ") || "none"}${i.start_date ? ` started ${i.start_date}` : ""}`);
    if (i.goal_text) out.push(`Goal: ${i.goal_text}`);
    if (i.description) out.push(`Description: ${i.description}`);
    out.push(`Roster: ${ros.length} people; solid ${counts.solid}, trained ${counts.trained}, needs follow-up ${counts.needs_followup}, not started ${counts.not_started}`);
    const byStore = new Map<string, string[]>();
    for (const r of ros) {
      const p = snap.people.find((x) => x.id === r.person_id);
      if (!p) continue;
      const key = storeName(p.store_id);
      const list = byStore.get(key) || [];
      list.push(`${p.name} (${p.role}${p.location ? ", " + p.location : ""}): ${ROSTER_LABEL[r.status]}${r.trained_on ? " on " + r.trained_on : ""}${r.notes ? " – " + r.notes : ""}`);
      byStore.set(key, list);
    }
    for (const [k, list] of byStore) out.push(`  ${k}: ${list.join("; ")}`);
    const goals = snap.goals.filter((g) => g.initiative_id === i.id);
    for (const g of goals) {
      const e = snap.entries.filter((x) => x.goal_id === g.id);
      out.push(`  Goal metric "${g.name}" target ${g.target ?? "n/a"}${g.unit} (${g.direction === "up" ? "higher better" : "lower better"}): ${e.map((x) => `${x.date}=${x.value}${g.unit}`).join(", ") || "no entries"}`);
    }
  }

  out.push("\n# STORE-LEVEL GOALS");
  for (const g of snap.goals.filter((g) => !g.initiative_id)) {
    const e = snap.entries.filter((x) => x.goal_id === g.id);
    out.push(`- ${storeName(g.store_id)}: "${g.name}" target ${g.target ?? "n/a"}${g.unit}: ${e.map((x) => `${x.date}=${x.value}${g.unit}`).join(", ") || "no entries"}`);
  }

  out.push("\n# PEOPLE NOT ON ANY ROSTER (active)");
  const onAny = new Set(snap.roster.map((r) => r.person_id));
  const off = snap.people.filter((p) => p.active && !onAny.has(p.id));
  out.push(off.length ? off.map((p) => `${p.name} (${storeName(p.store_id)}, ${p.role})`).join("; ") : "none");

  out.push("\n# VISITS (newest first)");
  for (const v of snap.visits) {
    out.push(`## ${v.date} ${storeName(v.store_id)}${v.focus ? " – " + v.focus : ""}`);
    if (v.initiative_ids.length) out.push(`Initiatives: ${v.initiative_ids.map(initName).filter(Boolean).join(", ")}`);
    if (v.people_ids.length) out.push(`People: ${v.people_ids.map(personName).filter(Boolean).join(", ")}`);
    if (v.summary) out.push(`Recap: ${v.summary}`);
    if (v.private_notes) out.push(`Trainer notes: ${v.private_notes}`);
    if (v.next_visit_date) out.push(`Next visit: ${v.next_visit_date}${v.next_visit_plan ? " – " + v.next_visit_plan : ""}`);
  }

  out.push("\n# OPEN TO-DOS");
  const open = snap.todos.filter((t) => !t.done);
  out.push(open.length ? open.map((t) => `- [${storeName(t.store_id)}] ${t.text}${t.due ? " (due " + t.due + ")" : ""}${t.person_id ? " re " + personName(t.person_id) : ""}`).join("\n") : "none");
  const doneRecent = snap.todos.filter((t) => t.done && t.done_at).sort((a, b) => (b.done_at! > a.done_at! ? 1 : -1)).slice(0, 25);
  if (doneRecent.length) {
    out.push("\n# RECENTLY COMPLETED TO-DOS");
    out.push(doneRecent.map((t) => `- ${t.done_at!.slice(0, 10)} [${storeName(t.store_id)}] ${t.text}`).join("\n"));
  }

  out.push("\n# MANAGER COMMITMENTS");
  out.push(snap.commitments.length ? snap.commitments.map((c) => `- ${storeName(c.store_id)}: ${c.owner} – ${c.text} [${COMMITMENT_LABEL[c.status]}${c.checked_at ? ", checked " + c.checked_at : ""}]${c.notes ? " " + c.notes : ""}`).join("\n") : "none");

  const posts = await getStorePosts({ limit: 60 });
  out.push("\n# NOTES, QUESTIONS, AND IDEAS POSTED BY STORE MANAGERS");
  out.push(posts.length ? posts.map((p) => `- ${p.created_at.slice(0, 10)} [${storeName(p.store_id)}] ${p.kind} from ${p.author} (${p.status}): ${p.body}${p.reply ? ` | Laura replied: ${p.reply}` : ""}`).join("\n") : "none");

  const examples = await getExamples({ limit: 300 });
  out.push("\n# SCREENSHOT EXAMPLES LIBRARY (captions only; images not included)");
  out.push("kind: good = a good example worth showing; opportunity = something to coach; pattern = a recurring thing to address");
  out.push(examples.length ? examples.map((e) => `- ${e.taken_on} [${e.kind}]${e.theme ? ` theme: ${e.theme}` : ""}${e.initiative_id ? ` initiative: ${initName(e.initiative_id)}` : ""}${e.store_id ? ` store: ${storeName(e.store_id)}` : ""}${e.person_ids.length ? ` people: ${e.person_ids.map(personName).filter(Boolean).join(", ")}` : ""}${e.caption ? ` | ${e.caption}` : ""}`).join("\n") : "none");

  out.push("\n# WINS");
  out.push(snap.wins.length ? snap.wins.map((w) => `- ${w.date} [${storeName(w.store_id)}]${w.person_id ? " " + personName(w.person_id) + ":" : ""} ${w.text}`).join("\n") : "none");

  return out.join("\n");
}

export type WeekWindow = { start: string; end: string };

export function weekWindow(daysBack = 7): WeekWindow {
  const end = today();
  return { start: addDays(end, -(daysBack - 1)), end };
}
