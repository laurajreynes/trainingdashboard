import Link from "next/link";
import { isEditor } from "@/lib/auth";
import { getGroupNotes, getMeetings } from "@/lib/data";
import { fmtDate, relDay, nextGmMeeting, today } from "@/lib/fmt";
import { saveGroupNote, addMeeting, updateMeeting, deleteMeeting } from "@/app/actions";

export const dynamic = "force-dynamic";

const SECTIONS: { key: string; title: string; hint: string }[] = [
  { key: "mission", title: "Mission", hint: "Why the group exists. One or two sentences." },
  { key: "vision", title: "Philosophy", hint: "The areas the group runs on." },
  { key: "values", title: "Values", hint: "One per line." },
];

export default async function GroupPage() {
  const [editor, notes, meetings] = await Promise.all([isEditor(), getGroupNotes(), getMeetings(36)]);
  const body = (k: string) => notes.find((n) => n.key === k)?.body || "";
  const next = nextGmMeeting();
  const nextMeeting = meetings.find((m) => m.date === next);
  const upcoming = meetings.filter((m) => m.date >= today()).sort((a, b) => a.date.localeCompare(b.date));
  const past = meetings.filter((m) => m.date < today());

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Ressler Motors</div>
          <h1>Group focus</h1>
          <div className="sub small">What we're about, the monthly GM meeting, and notes that apply to every store.</div>
        </div>
      </div>

      <div className="grid main-side">
        <div className="stack">
          <section className="card">
            <div className="cardhead"><h2>Mission, philosophy, values</h2></div>
            <div className="grid cols-3">
              {SECTIONS.map((sec) => (
                <div key={sec.key}>
                  <h3 style={{ marginBottom: 6 }}>{sec.title}</h3>
                  {editor ? (
                    <form action={saveGroupNote}>
                      <input type="hidden" name="key" value={sec.key} />
                      <textarea name="body" defaultValue={body(sec.key)} placeholder={sec.hint} style={{ minHeight: 120 }} />
                      <button className="btn sm ghost" style={{ marginTop: 6 }}>Save</button>
                    </form>
                  ) : body(sec.key) ? (
                    <div className="prose">{body(sec.key).split(/\r?\n/).filter(Boolean).map((line, i) => {
                      const m = line.match(/^(.+?):\s(.+)$/);
                      if (line.startsWith("- ")) return <li key={i}>{line.slice(2)}</li>;
                      if (m && m[1].length < 60) return <p key={i}><strong>{m[1]}:</strong> {m[2]}</p>;
                      return <p key={i}>{line}</p>;
                    })}</div>
                  ) : <p className="empty">Not written yet</p>}
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="cardhead"><h2>GM meetings</h2><span className="faint small">Second Thursday of every month</span></div>
            <div className="nextmeeting">
              <div>
                <div className="eyebrow">Next meeting</div>
                <div className="bigdate">{fmtDate(next, { weekday: true })}</div>
                <div className="faint small">{relDay(next)}</div>
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                {nextMeeting?.agenda
                  ? <><div className="eyebrow">Agenda</div><p className="pre">{nextMeeting.agenda}</p></>
                  : <p className="empty">No agenda yet{editor ? ". Add one below." : ""}</p>}
              </div>
            </div>

            {editor && !nextMeeting && (
              <details className="adder" style={{ marginTop: 12 }}>
                <summary>Agenda for {fmtDate(next)}</summary>
                <form action={addMeeting} className="body">
                  <input type="hidden" name="date" value={next} />
                  <div className="frow wide"><label className="f">Agenda<textarea name="agenda" placeholder={"Training update by store\nOctober focus\nStore notes worth raising"} /></label></div>
                  <button className="btn sm">Save agenda</button>
                </form>
              </details>
            )}

            {(upcoming.length > 0 || past.length > 0) && (
              <ul className="list" style={{ marginTop: 14 }}>
                {[...upcoming, ...past].map((m) => (
                  <li key={m.id}>
                    <div className="grow">
                      <strong>{fmtDate(m.date, { weekday: true })}</strong>{m.title !== "GM meeting" ? ` · ${m.title}` : ""}
                      {m.agenda && <details className="quiet" style={{ borderTop: 0, marginTop: 2, paddingTop: 0 }}><summary>Agenda</summary><p className="pre muted small" style={{ marginTop: 4 }}>{m.agenda}</p></details>}
                      {m.notes ? <p className="pre small" style={{ marginTop: 4 }}>{m.notes}</p> : <span className="faint small">No notes</span>}
                      {editor && (
                        <details className="quiet" style={{ borderTop: 0, marginTop: 4, paddingTop: 0 }}>
                          <summary>Edit</summary>
                          <form action={updateMeeting} style={{ marginTop: 6 }}>
                            <input type="hidden" name="id" value={m.id} />
                            <div className="frow">
                              <input type="date" name="date" defaultValue={m.date} />
                              <input type="text" name="title" defaultValue={m.title} />
                            </div>
                            <div className="frow wide"><textarea name="agenda" defaultValue={m.agenda || ""} placeholder="Agenda" style={{ minHeight: 60 }} /></div>
                            <div className="frow wide"><textarea name="notes" defaultValue={m.notes || ""} placeholder="Notes, decisions, follow-ups" /></div>
                            <button className="btn sm">Save</button>
                          </form>
                          <form action={deleteMeeting} style={{ marginTop: 6 }}><input type="hidden" name="id" value={m.id} /><button className="btn sm danger">Delete</button></form>
                        </details>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {editor && (
              <details className="adder" style={{ marginTop: 12 }}>
                <summary>Log a meeting</summary>
                <form action={addMeeting} className="body">
                  <div className="frow">
                    <label className="f">Date<input type="date" name="date" defaultValue={today()} required /></label>
                    <label className="f">Title<input type="text" name="title" defaultValue="GM meeting" /></label>
                  </div>
                  <div className="frow wide"><label className="f">Agenda<textarea name="agenda" style={{ minHeight: 60 }} /></label></div>
                  <div className="frow wide"><label className="f">Notes<textarea name="notes" placeholder="Decisions, who owns what, follow-ups" /></label></div>
                  <button className="btn sm">Save</button>
                </form>
              </details>
            )}
          </section>
        </div>

        <div className="stack">
          <section className="card">
            <div className="cardhead"><h2>Group notes</h2></div>
            {editor ? (
              <form action={saveGroupNote}>
                <input type="hidden" name="key" value="notes" />
                <textarea name="body" defaultValue={body("notes")} placeholder="Anything that applies across stores: pay plan changes, group standards, vendor contacts, standing reminders" style={{ minHeight: 200 }} />
                <button className="btn sm ghost" style={{ marginTop: 6 }}>Save</button>
              </form>
            ) : body("notes") ? <p className="pre">{body("notes")}</p> : <p className="empty">Nothing yet</p>}
          </section>
          <section className="card">
            <div className="cardhead"><h2>Related</h2></div>
            <ul className="list small">
              <li><Link href="/initiatives">Initiatives across the group</Link></li>
              <li><Link href="/recap">Weekly recap for the Friday email</Link></li>
              <li><Link href="/import">Import store results from the PR</Link></li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
