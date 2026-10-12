"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";

export type PersonRow = { id: string; name: string; role: string; last: string | null; lastLabel: string | null; trained: number; total: number; group?: string };

/** Salespeople and agents first, then support roles, then managers. */
const rank = (role: string) => /manager|^gm$|general manager/i.test(role) ? 2 : /salesperson|bdc agent/i.test(role) ? 0 : 1;

/** "7 people" → a popup: who's here, when Laura last worked with them, and how far along they are. */
export function PeoplePopup({ rows, label, title, groups }: { rows: PersonRow[]; label: string; title: string; groups?: string[] }) {
  const order = groups || [...new Set(rows.map((r) => r.group || ""))];
  const sorted = [...rows].sort((a, b) => (order.indexOf(a.group || "") - order.indexOf(b.group || "")) || (rank(a.role) - rank(b.role)) || a.name.localeCompare(b.name));
  const showGroups = order.filter(Boolean).length > 1;
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
            {sorted.map((r, i) => (
              <Fragment key={r.id}>
              {showGroups && (i === 0 || sorted[i - 1].group !== r.group) && <li className="grouphead"><div className="eyebrow">{r.group}</div></li>}
              <li>
                <div className="grow">
                  <div><Link href={`/p/${r.id}`}><strong>{r.name}</strong></Link> <span className="faint small">{r.role}</span></div>
                  <div className="small muted">{r.lastLabel ? `Last worked with ${r.lastLabel}` : "Not worked with yet"}{r.total ? ` · ${r.trained} of ${r.total} initiatives trained` : ""}</div>
                  {r.total > 0 && <div className="progress" style={{ marginTop: 4, maxWidth: 220 }}><span className="trained" style={{ width: `${(r.trained / r.total) * 100}%` }} /></div>}
                </div>
              </li>
              </Fragment>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  );
}
