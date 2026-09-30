import { getHubSnapshot } from "@/lib/data";
import { weekWindow } from "@/lib/context";
import { fmtDate } from "@/lib/fmt";
import { CopyButton } from "@/components/CopyButton";

export const dynamic = "force-dynamic";

export default async function Recap({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const sp = await searchParams;
  const days = Math.max(1, Math.min(31, Number(sp.days) || 7));
  const { start, end } = weekWindow(days);
  const snap = await getHubSnapshot();
  const storeName = (id: string | null) => snap.stores.find((s) => s.id === id)?.name || "General";
  const shortName = (id: string | null) => snap.stores.find((s) => s.id === id)?.short_name || "General";
  const personName = (id: string | null) => snap.people.find((p) => p.id === id)?.name || "";
  const initName = (id: string) => snap.initiatives.find((i) => i.id === id)?.name || "";

  const visits = snap.visits.filter((v) => v.date >= start && v.date <= end).sort((a, b) => a.date.localeCompare(b.date));
  const wins = snap.wins.filter((w) => w.date >= start && w.date <= end);
  const doneTodos = snap.todos.filter((t) => t.done && t.done_at && t.done_at.slice(0, 10) >= start);
  const openTodos = snap.todos.filter((t) => !t.done);
  const nextVisits = snap.stores.filter((s) => !s.is_bdc).map((s) => {
    const v = snap.visits.filter((x) => x.store_id === s.id && x.next_visit_date && x.next_visit_date > end).sort((a, b) => a.next_visit_date!.localeCompare(b.next_visit_date!))[0];
    return v ? `${s.short_name}: ${fmtDate(v.next_visit_date!, { weekday: true })}${v.next_visit_plan ? " – " + v.next_visit_plan : ""}` : null;
  }).filter(Boolean) as string[];

  const lines: string[] = [];
  lines.push(`Training recap, ${fmtDate(start)} to ${fmtDate(end)}`);
  lines.push("");
  const byStore = new Map<string, typeof visits>();
  for (const v of visits) byStore.set(v.store_id, [...(byStore.get(v.store_id) || []), v]);
  if (!visits.length) lines.push("No store visits logged this week.");
  for (const [sid, vs] of byStore) {
    lines.push(storeName(sid).toUpperCase());
    for (const v of vs) {
      lines.push(`${fmtDate(v.date, { weekday: true })}${v.focus ? " – " + v.focus : ""}`);
      if (v.summary) lines.push(v.summary);
      const tags = [...v.initiative_ids.map(initName).filter(Boolean)];
      if (tags.length) lines.push(`Focus: ${tags.join(", ")}`);
      const who = v.people_ids.map(personName).filter(Boolean);
      if (who.length) lines.push(`Worked with: ${who.join(", ")}`);
      lines.push("");
    }
  }
  if (wins.length) {
    lines.push("WINS");
    for (const w of wins) lines.push(`- ${shortName(w.store_id)}${w.person_id ? ", " + personName(w.person_id) : ""}: ${w.text}`);
    lines.push("");
  }
  if (doneTodos.length) {
    lines.push("DONE THIS WEEK");
    for (const t of doneTodos) lines.push(`- ${shortName(t.store_id)}: ${t.text}`);
    lines.push("");
  }
  if (nextVisits.length) {
    lines.push("NEXT WEEK");
    for (const n of nextVisits) lines.push(`- ${n}`);
    lines.push("");
  }
  if (openTodos.length) {
    lines.push("STILL OPEN");
    for (const t of openTodos.slice(0, 15)) lines.push(`- ${shortName(t.store_id)}: ${t.text}${t.due ? " (due " + fmtDate(t.due) + ")" : ""}`);
    if (openTodos.length > 15) lines.push(`- and ${openTodos.length - 15} more`);
  }
  const text = lines.join("\n").trim();

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Friday email</div>
          <h1>Weekly recap</h1>
          <div className="sub small">
            {[7, 14, 30].map((d) => <a key={d} href={`/recap?days=${d}`} className={days === d ? "" : "faint"} style={{ marginRight: 10 }}>Last {d} days</a>)}
          </div>
        </div>
        <CopyButton text={text} />
      </div>
      <p className="muted small" style={{ marginBottom: 12 }}>Built from visit recaps, wins, completed to-dos, and next-visit plans. Trainer notes are left out. Edit in your email before sending.</p>
      <div className="recap">{text}</div>
    </>
  );
}
