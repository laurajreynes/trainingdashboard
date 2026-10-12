"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export type PersonRow = { id: string; name: string; role: string; last: string | null; lastLabel: string | null; trained: number; total: number };

/** "7 people" → a popup: who's here, when Laura last worked with them, and how far along they are. */
export function PeoplePopup({ rows, label, title }: { rows: PersonRow[]; label: string; title: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  return (
    <>
      <button type="button" className="linkbtn" onClick={() => setOpen(true)}>{label}</button>
      <dialog ref={ref} className="initdialog" onClose={() => setOpen(false)} onClick={(e) => { if (e.target === ref.current) setOpen(false); }}>
        <div className="initdialog-body">
          <div className="initcard-top"><h2>{title}</h2><button type="button" className="iconbtn" aria-label="Close" onClick={() => setOpen(false)}>×</button></div>
          <ul className="list" style={{ marginTop: 8 }}>
            {rows.map((r) => (
              <li key={r.id}>
                <div className="grow">
                  <div><Link href={`/p/${r.id}`}><strong>{r.name}</strong></Link> <span className="faint small">{r.role}</span></div>
                  <div className="small muted">{r.lastLabel ? `Last worked with ${r.lastLabel}` : "Not worked with yet"}{r.total ? ` · ${r.trained} of ${r.total} initiatives trained` : ""}</div>
                  {r.total > 0 && <div className="progress" style={{ marginTop: 4, maxWidth: 220 }}><span className="trained" style={{ width: `${(r.trained / r.total) * 100}%` }} /></div>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  );
}
