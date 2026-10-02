import Link from "next/link";
import type { Store, Visit, Todo } from "@/lib/types";
import { today, addDays, weeksBack, fmtDate, storeAccent, nextGmMeeting } from "@/lib/fmt";

type Props = { visits: Visit[]; todos: Todo[]; stores: Store[]; editor?: boolean };

/** "11am Toyota training" → time "11am", rest "Toyota training". */
export function splitTime(focus: string | null): { time: string | null; text: string } {
  if (!focus) return { time: null, text: "" };
  const m = focus.match(/^\s*(\d{1,2}(?::\d{2})?\s?(?:am|pm))\s*[-–:,]?\s*(.*)$/i);
  return m ? { time: m[1].replace(/\s/g, "").toLowerCase(), text: m[2] } : { time: null, text: focus };
}

/** Monday to Friday of this week. Today gets the wide column. */
export function WeekCalendar({ visits, todos, stores, editor }: Props) {
  const t = today();
  const monday = weeksBack(1)[0];
  const days = Array.from({ length: 5 }, (_, i) => addDays(monday, i));
  const gm = nextGmMeeting();
  const store = (id: string | null) => stores.find((s) => s.id === id);
  const todayIdx = days.indexOf(t);
  const cols = days.map((d) => (d === t ? "2.6fr" : "1fr")).join(" ");
  return (
    <section className="card weekcal">
      <div className="cardhead">
        <h2>Today and this week</h2>
        {editor && <Link className="more" href="/visit/new?plan=1">Schedule</Link>}
      </div>
      <div className="weekrow" style={{ gridTemplateColumns: cols }}>
        {days.map((d) => {
          const sessions = visits.filter((v) => v.date === d).sort((a, b) => (splitTime(a.focus).time || "zz").localeCompare(splitTime(b.focus).time || "zz"));
          const dues = todos.filter((x) => !x.done && x.due === d);
          const isToday = d === t;
          return (
            <div key={d} className={`day${isToday ? " today" : ""}${d < t ? " past" : ""}`}>
              <div className="dayhead">
                <span className="dow">{isToday ? "Today" : fmtDate(d, { weekday: true }).split(",")[0]}</span>
                <span className="dnum">{fmtDate(d)}</span>
              </div>
              {sessions.map((v) => {
                const s = store(v.store_id);
                const { time, text } = splitTime(v.focus);
                return (
                  <Link key={v.id} href={s ? `/s/${s.slug}` : `/v/${v.id}`} className="sess" style={{ ["--accent" as string]: storeAccent(s) }} title={v.focus || ""}>
                    {time && <span className="when">{time}</span>}
                    <span className="who">{s?.short_name || "Visit"}</span>
                    {text && <span className="what">{text}</span>}
                  </Link>
                );
              })}
              {d === gm && <Link href="/group" className="sess gm"><span className="who">GM meeting</span></Link>}
              {dues.map((x) => {
                const s = store(x.store_id);
                return <Link key={x.id} href={s ? `/s/${s.slug}` : "/todos"} className="sess due" style={{ ["--accent" as string]: storeAccent(s) }} title={x.text}><span className="what">{x.text}</span></Link>;
              })}
              {isToday && !sessions.length && !dues.length && d !== gm && <p className="empty">Nothing on the calendar</p>}
            </div>
          );
        })}
      </div>
      {todayIdx < 0 && <p className="faint small" style={{ marginTop: 8 }}>Weekend. Back Monday.</p>}
    </section>
  );
}
