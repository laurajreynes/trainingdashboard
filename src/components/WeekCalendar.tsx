import Link from "next/link";
import type { Store, Visit, Todo } from "@/lib/types";
import { today, addDays, weeksBack, fmtDate, storeAccent, nextGmMeeting } from "@/lib/fmt";

type Props = { visits: Visit[]; todos: Todo[]; stores: Store[]; weeks?: number; editor?: boolean };

/** This week and next, one column per day. Sessions link to the store; dated to-dos ride along. */
export function WeekCalendar({ visits, todos, stores, weeks = 2, editor }: Props) {
  const t = today();
  const monday = weeksBack(1)[0];
  const days = Array.from({ length: 7 * weeks }, (_, i) => addDays(monday, i));
  const gm = nextGmMeeting();
  const byDay = (d: string) => ({
    sessions: visits.filter((v) => v.date === d),
    dues: todos.filter((x) => !x.done && x.due === d),
  });
  const store = (id: string | null) => stores.find((s) => s.id === id);
  const dow = (d: string) => fmtDate(d, { weekday: true }).split(",")[0];
  return (
    <section className="card weekcal">
      <div className="cardhead">
        <h2>Training calendar</h2>
        {editor && <Link className="more" href="/visit/new?plan=1">Schedule a session</Link>}
      </div>
      {Array.from({ length: weeks }, (_, w) => (
        <div className="weekrow" key={w}>
          {days.slice(w * 7, w * 7 + 7).map((d) => {
            const { sessions, dues } = byDay(d);
            const isToday = d === t;
            const past = d < t;
            return (
              <div key={d} className={`day${isToday ? " today" : ""}${past ? " past" : ""}`}>
                <div className="dayhead"><span className="dow">{dow(d)}</span> <span className="dnum">{d.slice(8).replace(/^0/, "")}</span></div>
                {sessions.map((v) => {
                  const s = store(v.store_id);
                  return (
                    <Link key={v.id} href={s ? `/s/${s.slug}` : `/v/${v.id}`} className="sess" style={{ ["--accent" as string]: storeAccent(s) }} title={v.focus || ""}>
                      <span className="who">{s?.short_name || "Visit"}</span>
                      {v.focus && <span className="what">{v.focus}</span>}
                    </Link>
                  );
                })}
                {d === gm && <Link href="/group" className="sess gm"><span className="who">GM meeting</span></Link>}
                {dues.map((x) => {
                  const s = store(x.store_id);
                  return <Link key={x.id} href={s ? `/s/${s.slug}` : "/todos"} className="sess due" style={{ ["--accent" as string]: storeAccent(s) }} title={x.text}><span className="what">{x.text}</span></Link>;
                })}
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
