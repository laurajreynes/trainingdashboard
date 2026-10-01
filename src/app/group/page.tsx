import Link from "next/link";
import { isEditor } from "@/lib/auth";
import { getGroupNotes, getMeetings, getMonthPlans, getStores } from "@/lib/data";
import { fmtDate, relDay, nextGmMeeting, today, monthName, storeAccent } from "@/lib/fmt";
import { monthPhase } from "@/lib/month";
import { saveGroupNote, addMeeting, updateMeeting, deleteMeeting, saveMonthPlan } from "@/app/actions";

export const dynamic = "force-dynamic";

const SECTIONS: { key: string; title: string; hint: string }[] = [
  { key: "mission", title: "Mission", hint: "Why the group exists" },
  { key: "vision", title: "Philosophy", hint: "What the group runs on" },
  { key: "values", title: "Values", hint: "One per line" },
];

function Lines({ text }: { text: string }) {
  return (
    <div className="prose">
      {text.split(/\r?\n/).filter(Boolean).map((line, i) => {
        const m = line.match(/^(.+?):\s(.+)$/);
        if (line.startsWith("- ")) return <li key={i}>{line.slice(2)}</li>;
        if (m && m[1].length < 60) return <p key={i}><strong>{m[1]}:</strong> {m[2]}</p>;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

export default async function GroupPage() {
  const mi = monthPhase();
  const [editor, notes, meetings, plans, stores] = await Promise.all([isEditor(), getGroupNotes(), getMeetings(36), getMonthPlans([mi.month]), getStores()]);
  const body = (k: string) => notes.find((n) => n.key === k)?.body || "";
  const next = nextGmMeeting();
  const nextMeeting = meetings.find((m) => m.date === next);
  const past = meetings.filter((m) => m.date < today());
  const groupPlan = plans.find((p) => p.month === mi.month && p.store_id === null);
  const storePlans = stores.filter((s) => !s.is_bdc || plans.some((p) => p.store_id === s.id)).map((s) => ({ s, p: plans.find((p) => p.month === mi.month && p.store_id === s.id) }));

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Ressler Motors</div>
          <h1>Group focus</h1>
        </div>
      </div>

      <div className="grid main-side">
        <div className="stack">
          <section className="card">
            <div className="cardhead"><h2>{monthName(mi.month)} focus by store</h2></div>
            <ul className="list focuslist">
              <li>
                <span className="tag">Group</span>
                <div className="grow">
                  {groupPlan?.focus ? <span>{groupPlan.focus}</span> : <span className="faint">Nothing set for the group yet</span>}
                  {editor && (
                    <details className="quiet" style={{ borderTop: 0, marginTop: 2, paddingTop: 0 }}>
                      <summary>Edit</summary>
                      <form action={saveMonthPlan} style={{ marginTop: 6 }}>
                        <input type="hidden" name="month" value={mi.month} />
                        <textarea name="focus" defaultValue={groupPlan?.focus || ""} placeholder="One or two behaviors the whole group is driving" style={{ minHeight: 60 }} />
                        <button className="btn sm ghost" style={{ marginTop: 6 }}>Save</button>
                      </form>
                    </details>
                  )}
                </div>
              </li>
              {storePlans.map(({ s, p }) => (
                <li key={s.id}>
                  <span className="tag" style={{ color: storeAccent(s), borderColor: storeAccent(s) }}>{s.short_name}</span>
                  <div className="grow">{p?.focus ? <Link href={`/s/${s.slug}`} className="plain">{p.focus}</Link> : <Link href={`/s/${s.slug}`} className="faint">Not set</Link>}</div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card creed">
            <div className="grid cols-3">
              {SECTIONS.map((sec) => (
                <div key={sec.key}>
                  <div className="eyebrow">{sec.title}</div>
                  {body(sec.key) ? <Lines text={body(sec.key)} /> : <p className="empty">{sec.hint}</p>}
                </div>
              ))}
            </div>
            {editor && (
              <details className="quiet" style={{ marginTop: 14 }}>
                <summary>Edit mission, philosophy, values</summary>
                <div className="grid cols-3" style={{ marginTop: 10 }}>
                  {SECTIONS.map((sec) => (
                    <form key={sec.key} action={saveGroupNote}>
                      <input type="hidden" name="key" value={sec.key} />
                      <label className="f">{sec.title}<textarea name="body" defaultValue={body(sec.key)} placeholder={sec.hint} style={{ minHeight: 140 }} /></label>
                      <button className="btn sm ghost" style={{ marginTop: 6 }}>Save {sec.title.toLowerCase()}</button>
                    </form>
                  ))}
                </div>
              </details>
            )}
          </section>

          <section className="card">
            <div className="cardhead"><h2>Group notes</h2></div>
            {body("notes") ? <p className="pre">{body("notes")}</p> : <p className="empty">Nothing yet</p>}
            {editor && (
              <details className="quiet" style={{ marginTop: 8 }}>
                <summary>Edit</summary>
                <form action={saveGroupNote} style={{ marginTop: 8 }}>
                  <input type="hidden" name="key" value="notes" />
                  <textarea name="body" defaultValue={body("notes")} placeholder="Anything that applies across stores" style={{ minHeight: 160 }} />
                  <button className="btn sm ghost" style={{ marginTop: 6 }}>Save</button>
                </form>
              </details>
            )}
          </section>
        </div>

        <div className="stack">
          <section className="card meetingcard">
            <div className="eyebrow">Next GM meeting</div>
            <div className="bigdate">{fmtDate(next, { weekday: true })}</div>
            <div className="muted small" style={{ marginBottom: 10 }}>{relDay(next)} · second Thursday</div>
            {nextMeeting?.agenda
              ? <p className="pre">{nextMeeting.agenda}</p>
              : <p className="empty">No agenda yet</p>}
            {editor && (
              <details className="quiet" style={{ marginTop: 8 }}>
                <summary>{nextMeeting ? "Edit agenda" : "Write the agenda"}</summary>
                <form action={nextMeeting ? updateMeeting : addMeeting} style={{ marginTop: 8 }}>
                  {nextMeeting ? <input type="hidden" name="id" value={nextMeeting.id} /> : null}
                  <input type="hidden" name="date" value={next} />
                  <input type="hidden" name="title" value={nextMeeting?.title || "GM meeting"} />
                  <textarea name="agenda" defaultValue={nextMeeting?.agenda || ""} placeholder={"Training update by store\nThis month's focus\nStore notes worth raising"} style={{ minHeight: 110 }} />
                  {nextMeeting ? <textarea name="notes" defaultValue={nextMeeting.notes || ""} placeholder="Notes (after the meeting)" style={{ minHeight: 60, marginTop: 6 }} /> : null}
                  <button className="btn sm" style={{ marginTop: 6 }}>Save</button>
                </form>
              </details>
            )}
          </section>

          <section className="card">
            <div className="cardhead"><h2>Past meetings</h2></div>
            {past.length ? (
              <ul className="list">
                {past.map((m) => (
                  <li key={m.id}>
                    <div className="grow">
                      <details className="quiet" style={{ borderTop: 0, marginTop: 0, paddingTop: 0 }}>
                        <summary><strong>{fmtDate(m.date)}</strong>{m.title !== "GM meeting" ? ` · ${m.title}` : ""}{!m.notes && <span className="faint small"> · no notes</span>}</summary>
                        {m.agenda && <p className="pre muted small" style={{ marginTop: 6 }}>{m.agenda}</p>}
                        {m.notes && <p className="pre small" style={{ marginTop: 6 }}>{m.notes}</p>}
                        {editor && (
                          <>
                            <form action={updateMeeting} style={{ marginTop: 8 }}>
                              <input type="hidden" name="id" value={m.id} />
                              <input type="hidden" name="date" value={m.date} />
                              <input type="hidden" name="title" value={m.title} />
                              <input type="hidden" name="agenda" value={m.agenda || ""} />
                              <textarea name="notes" defaultValue={m.notes || ""} placeholder="Decisions, who owns what, follow-ups" style={{ minHeight: 60 }} />
                              <button className="btn sm ghost" style={{ marginTop: 6 }}>Save notes</button>
                            </form>
                            <form action={deleteMeeting} style={{ marginTop: 6 }}><input type="hidden" name="id" value={m.id} /><button className="btn sm danger">Delete</button></form>
                          </>
                        )}
                      </details>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="empty">None logged</p>}
            {editor && (
              <details className="quiet" style={{ marginTop: 8 }}>
                <summary>Log a meeting</summary>
                <form action={addMeeting} style={{ marginTop: 8 }}>
                  <div className="frow">
                    <input type="date" name="date" defaultValue={today()} required />
                    <input type="text" name="title" defaultValue="GM meeting" />
                  </div>
                  <textarea name="agenda" placeholder="Agenda" style={{ minHeight: 50 }} />
                  <textarea name="notes" placeholder="Notes" style={{ minHeight: 60, marginTop: 6 }} />
                  <button className="btn sm" style={{ marginTop: 6 }}>Save</button>
                </form>
              </details>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
