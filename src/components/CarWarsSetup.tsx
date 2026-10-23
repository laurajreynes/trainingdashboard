"use client";
import { useEffect, useRef, useState } from "react";
import { saveGroupNote } from "@/app/actions";
import { SETUP_STEPS, parseSetup } from "@/lib/cwsetup";

export function CarWarsSetup({ body, storeSlug, editor }: { body: string | null; storeSlug: string; editor?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const people = parseSetup(body);
  if (!people.length) {
    if (!editor) return null;
    return (
      <details className="quiet" style={{ marginTop: 10 }}>
        <summary className="small">Add a setup list</summary>
        <form action={saveGroupNote} style={{ marginTop: 6 }}>
          <input type="hidden" name="key" value={`cwsetup:${storeSlug}`} />
          <textarea name="body" placeholder={"Name | agent line | L V C S | out"} style={{ minHeight: 140, fontSize: 13, fontFamily: "ui-monospace, monospace" }} />
          <p className="faint small" style={{ margin: "4px 0 6px" }}>One line per person. L logged in · V voice recognition · C click to call · S email signature.</p>
          <button className="btn sm ghost">Save</button>
        </form>
      </details>
    );
  }
  const active = people.filter((p) => !p.out);
  const out = people.filter((p) => p.out);
  const total = active.length;
  const count = (k: string) => active.filter((p) => p.done.has(k)).length;
  const allSet = active.filter((p) => SETUP_STEPS.every((s) => p.done.has(s.key)));
  const needs = (k: string) => active.filter((p) => !p.done.has(k));
  const started = active.filter((p) => p.done.size > 0 && p.done.size < 4);
  const untouched = active.filter((p) => p.done.size === 0);

  return (
    <>
      <button type="button" className="cwsetup" onClick={() => setOpen(true)} title="Who's set up, who still needs a step">
        <span className="cwsetup-head">
          <span className="cwsetup-h">Setup</span>
          <span className="small muted">{allSet.length} of {total} all set</span>
        </span>
        <span className="cwsetup-bars">
          {SETUP_STEPS.map((s) => {
            const n = count(s.key);
            return (
              <span key={s.key} className="cwsetup-bar">
                <span className="cwsetup-label"><span>{s.label}</span><b>{n}/{total}</b></span>
                <span className="progress"><span className={n === total && total > 0 ? "solid" : "trained"} style={{ width: `${total ? (n / total) * 100 : 0}%` }} /></span>
              </span>
            );
          })}
        </span>
      </button>

      <dialog ref={ref} className="initdialog" onClose={() => setOpen(false)} onClick={(e) => { if (e.target === ref.current) setOpen(false); }}>
        <div className="initdialog-body">
          <div className="cardhead" style={{ marginBottom: 10 }}><h2 style={{ fontSize: 20 }}>CarWars setup</h2><span className="small muted">{allSet.length} of {total} all set</span></div>

          <table className="cwgrid">
            <thead>
              <tr>
                <th />
                {SETUP_STEPS.map((s) => <th key={s.key}><span>{s.label}</span><small>{needs(s.key).length ? `${needs(s.key).length} to go` : "all done"}</small></th>)}
              </tr>
            </thead>
            <tbody>
              {[...allSet, ...started, ...untouched].map((p) => (
                <tr key={p.name} className={p.done.size === 4 ? "set" : ""}>
                  <td>{p.name}</td>
                  {SETUP_STEPS.map((s) => <td key={s.key}><i className={p.done.has(s.key) ? "on" : ""} aria-label={p.done.has(s.key) ? "done" : "not yet"} /></td>)}
                </tr>
              ))}
              {out.map((p) => (
                <tr key={p.name} className="out">
                  <td>{p.name} <small>out</small></td>
                  {SETUP_STEPS.map((s) => <td key={s.key}><i className={p.done.has(s.key) ? "on" : ""} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>

          {editor && (
            <details className="quiet" style={{ marginTop: 14 }}>
              <summary className="small">Edit</summary>
              <form action={saveGroupNote} style={{ marginTop: 6 }}>
                <input type="hidden" name="key" value={`cwsetup:${storeSlug}`} />
                <textarea name="body" defaultValue={body || ""} placeholder={"Name | agent line | L V C S | out"} style={{ minHeight: 220, fontSize: 13, fontFamily: "ui-monospace, monospace" }} />
                <p className="faint small" style={{ margin: "4px 0 6px" }}>L logged in · V voice recognition · C click to call · S email signature. Add &quot;out&quot; as a fourth field to keep someone off the counts.</p>
                <button className="btn sm ghost">Save</button>
              </form>
            </details>
          )}

          <div className="initdialog-actions"><button type="button" className="btn sm ghost" onClick={() => setOpen(false)}>Close</button></div>
        </div>
      </dialog>
    </>
  );
}
