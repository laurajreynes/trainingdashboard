"use client";
import { useEffect, useRef, useState } from "react";
import { WordTrack } from "./WordTrack";

/** A word track or script kept as text: the chip opens it in a popup instead of sending you off to the initiative page. */
export function TextResource({ kind, title, body, initName }: { kind: string; title: string; body: string | null; initName?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  return (
    <>
      <button type="button" className="chipr" onClick={() => setOpen(true)} title={initName}><span className="k">{kind}</span><span className="t">{title}</span></button>
      <dialog ref={ref} className="initdialog" onClose={() => setOpen(false)} onClick={(e) => { if (e.target === ref.current) setOpen(false); }}>
        <div className="initdialog-body">
          <div className="initcard-top"><h2 style={{ marginRight: 12 }}>{title}</h2><button type="button" className="iconbtn" aria-label="Close" onClick={() => setOpen(false)}>×</button></div>
          {initName && <div className="faint small" style={{ marginBottom: 10 }}>{initName}</div>}
          {body ? <WordTrack body={body} /> : <p className="empty">Nothing written in this one yet.</p>}
        </div>
      </dialog>
    </>
  );
}
