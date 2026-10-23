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
  if (!people.length && !editor) return null;
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
          <div className="cardhead" style={{ marginBottom: 6 }}><h2 style={{ fontSize: 20 }}>CarWars setup</h2><span className="small muted">{allSet.length} of {total} all set</span></div>

          {allSet.length > 0 && (
            <section className="cwsetup-sec">
              <h3>All set</h3>
              <ul className="cwsetup-names done">{allSet.map((p) => <li key={p.name}>{p.name}{p.line && <span className="line">{p.line}</span>}</li>)}</ul>
            </section>
          )}

          {SETUP_STEPS.map((s) => {
            const n = needs(s.key);
            if (!n.length) return null;
            return (
              <section key={s.key} className="cwsetup-sec">
                <h3>{s.label} <span className="muted">· {n.length} to go</span></h3>
                <ul className="cwsetup-names">{n.map((p) => <li key={p.name} className={p.done.size === 0 ? "fresh" : ""}>{p.name}{p.line && <span className="line">{p.line}</span>}</li>)}</ul>
              </section>
            );
          })}

          {(started.length > 0 || untouched.length > 0) && (
            <p className="small muted" style={{ marginTop: 10 }}>
              {started.length > 0 && <>{started.length} partway through. </>}
              {untouched.length > 0 && <>{untouched.length} haven&apos;t started: {untouched.map((p) => p.name.split(" ")[0]).join(", ")}.</>}
            </p>
          )}

          {out.length > 0 && (
            <section className="cwsetup-sec">
              <h3>Out right now</h3>
              <ul className="cwsetup-names muted">{out.map((p) => <li key={p.name}>{p.name}{p.line ? <span className="line">{p.line}</span> : <span className="line">no agent line yet</span>}</li>)}</ul>
            </section>
          )}

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
