"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { STAGES, ROSTER_LABEL } from "@/lib/types";
import type { Initiative, InitiativePerson, Store } from "@/lib/types";

export const AREAS = ["Internet and phone", "Internet", "Phone"] as const;
export const AREA_DEFAULT = AREAS[0];

function counts(roster: InitiativePerson[]) {
  const c = { trained: 0, needs: 0, not: 0, total: roster.length };
  for (const r of roster) {
    if (r.status === "trained" || r.status === "solid") c.trained++;
    else if (r.status === "needs_followup") c.needs++;
    else c.not++;
  }
  return c;
}

function Steps({ stage }: { stage: string }) {
  const idx = Math.max(0, (STAGES as readonly string[]).indexOf(stage));
  return (
    <span className="stagesteps" title={`Stage: ${stage}`}>
      <span className="stagesteps-bar">{STAGES.map((s, i) => <i key={s} className={i <= idx ? "on" : ""} />)}</span>
      <span className="stagesteps-label">{stage}</span>
    </span>
  );
}

function Bar({ roster, legend = false }: { roster: InitiativePerson[]; legend?: boolean }) {
  const c = counts(roster);
  const pct = (n: number) => (c.total ? (n / c.total) * 100 : 0);
  if (!c.total) return <p className="faint small">No one on the roster yet</p>;
  return (
    <>
      <div className="progress"><span className="trained" style={{ width: `${pct(c.trained)}%` }} /><span className="needs" style={{ width: `${pct(c.needs)}%` }} /></div>
      <div className="legend">
        <span>{c.trained} of {c.total} trained</span>
        {legend && (<><span><i style={{ background: "var(--gold)" }} />{ROSTER_LABEL.trained} {c.trained}</span><span><i style={{ background: "var(--warn)" }} />{ROSTER_LABEL.needs_followup} {c.needs}</span><span><i style={{ background: "var(--line)" }} />{ROSTER_LABEL.not_started} {c.not}</span></>)}
      </div>
    </>
  );
}

/** Compact card: name, stage, area, people trained. Click for the details and the way to the store page. */
export function InitiativeCard({ init, roster, stores, stage, area, hideStore }: {
  init: Initiative; roster: InitiativePerson[]; stores: Store[]; stage?: string; area?: string; hideStore?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const mine = stores.filter((s) => init.store_ids.includes(s.id));
  const c = counts(roster);
  const areaLabel = area || AREA_DEFAULT;
  return (
    <>
      <button type="button" className="initcard initbtn" onClick={() => setOpen(true)}>
        <div className="initcard-top">
          <h3>{init.name}</h3>
          {stage ? <Steps stage={stage} /> : null}
        </div>
        <div className="initcard-meta">
          <span className="tag area">{areaLabel}</span>
          {mine.length > 0 && <span className="faint small">{mine.map((s) => s.short_name).join(" · ")}</span>}
        </div>
        <div className="progress"><span className="trained" style={{ width: `${c.total ? (c.trained / c.total) * 100 : 0}%` }} /><span className="needs" style={{ width: `${c.total ? (c.needs / c.total) * 100 : 0}%` }} /></div>
        <div className="legend"><span>{c.trained} of {c.total} trained</span></div>
      </button>
      <dialog ref={ref} className="initdialog" onClose={() => setOpen(false)} onClick={(e) => { if (e.target === ref.current) setOpen(false); }}>
        <div className="initdialog-body">
          <div className="initcard-top">
            <h2 style={{ marginRight: 12 }}>{init.name}</h2>
            <button type="button" className="iconbtn" aria-label="Close" onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="initcard-meta" style={{ marginBottom: 10 }}>
            {stage && <span className="tag stage">{stage}</span>}
            <span className="tag area">{areaLabel}</span>
            {mine.map((s) => <span key={s.id} className="faint small">{s.short_name}</span>)}
          </div>
          {init.goal_text && <p style={{ fontWeight: 600, marginBottom: 8 }}>{init.goal_text}</p>}
          {init.description && <p className="pre muted small" style={{ marginBottom: 12 }}>{init.description}</p>}
          <Bar roster={roster} legend />
          <div className="initdialog-actions">
            {mine.filter((s) => s.slug !== hideStore).map((s) => (
              <Link key={s.id} href={`/s/${s.slug}`} className="btn big" style={{ background: "var(--forest)" }}>View on the {s.short_name} page</Link>
            ))}
            <Link href={`/i/${init.id}`} className="btn ghost">Open the initiative</Link>
          </div>
        </div>
      </dialog>
    </>
  );
}
