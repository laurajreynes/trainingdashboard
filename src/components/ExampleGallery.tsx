"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ExampleView } from "@/lib/types";
import { EXAMPLE_KIND_LABEL } from "@/lib/types";
import { fmtDate } from "@/lib/fmt";
import { updateExample, deleteExample } from "@/app/actions";

type Opt = { id: string; name: string };
type Props = {
  items: ExampleView[];
  people: Opt[];
  initiatives: Opt[];
  stores: Opt[];
  themes?: string[];
  editor: boolean;
  startAt?: number;
  emptyText?: string;
};

const kindClass = (k: ExampleView["kind"]) => (k === "good" ? "good" : k === "opportunity" ? "warn" : "info");

export function ExampleGallery({ items, people, initiatives, stores, themes = [], editor, emptyText }: Props) {
  const [idx, setIdx] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const name = (id: string) => people.find((p) => p.id === id)?.name || "";
  const initName = (id: string | null) => initiatives.find((i) => i.id === id)?.name || "";

  const close = useCallback(() => { setIdx(null); setEditing(false); }, []);
  const step = useCallback((d: number) => setIdx((i) => (i === null ? null : (i + d + items.length) % items.length)), [items.length]);

  useEffect(() => {
    if (idx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [idx, close, step]);

  if (!items.length) return <p className="empty">{emptyText || "No examples yet"}</p>;
  const cur = idx === null ? null : items[idx];

  // swipe
  let touchX = 0;
  const onTouchStart = (e: React.TouchEvent) => { touchX = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => { const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); };

  return (
    <>
      <div className="exgrid">
        {items.map((e, i) => (
          <button key={e.id} type="button" className="excell" onClick={() => setIdx(i)} aria-label={e.caption || e.theme || "Example"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={e.url} alt={e.caption || ""} loading="lazy" />
            <span className={`exkind ${kindClass(e.kind)}`}>{EXAMPLE_KIND_LABEL[e.kind]}</span>
            {e.person_ids.length > 0 && <span className="exmeta">{e.person_ids.map(name).filter(Boolean).join(", ")}</span>}
          </button>
        ))}
      </div>

      {cur && (
        <div className="lightbox" onClick={close} role="dialog" aria-modal="true" aria-label="Example">
          <button type="button" className="lbx" onClick={close} aria-label="Close">×</button>
          {items.length > 1 && <button type="button" className="lbnav prev" onClick={(e) => { e.stopPropagation(); step(-1); }} aria-label="Previous">‹</button>}
          {items.length > 1 && <button type="button" className="lbnav next" onClick={(e) => { e.stopPropagation(); step(1); }} aria-label="Next">›</button>}
          <div className="lbbody" onClick={(e) => e.stopPropagation()} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div className="lbimg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cur.url} alt={cur.caption || ""} />
            </div>
            <aside className="lbside">
              <div className="lbhead">
                {cur.person_ids.length > 0 && <div className="lbname">{cur.person_ids.map((id, i) => <span key={id}>{i ? ", " : ""}<Link href={`/p/${id}`}>{name(id)}</Link></span>)}</div>}
                <span className={`tag ${kindClass(cur.kind)}`}>{EXAMPLE_KIND_LABEL[cur.kind]}</span>
              </div>
              {cur.caption && <p className="lbnote">{cur.caption}</p>}
              <div className="small faint" style={{ marginTop: 8 }}>{fmtDate(cur.taken_on)}{cur.initiative_id ? <> · <Link href={`/i/${cur.initiative_id}`}>{initName(cur.initiative_id)}</Link></> : null} · {idx! + 1} of {items.length}</div>
              {editor && !editing && (
                <div className="inline" style={{ marginTop: 12 }}>
                  <button type="button" className="btn sm ghost" onClick={() => setEditing(true)}>Edit</button>
                  <form action={deleteExample} onSubmit={(e) => { if (!confirm("Delete this example?")) e.preventDefault(); }}>
                    <input type="hidden" name="id" value={cur.id} />
                    <button className="btn sm danger">Delete</button>
                  </form>
                </div>
              )}
              {editor && editing && (
                <form action={updateExample} className="lbedit" onSubmit={() => setEditing(false)}>
                  <input type="hidden" name="id" value={cur.id} />
                  <select name="kind" defaultValue={cur.kind}>
                    <option value="good">Good example</option><option value="opportunity">Opportunity</option><option value="pattern">Pattern</option>
                  </select>
                  <input type="text" name="theme" defaultValue={cur.theme || ""} placeholder="Theme" list="ex-themes-edit" />
                  <datalist id="ex-themes-edit">{themes.map((t) => <option key={t} value={t} />)}</datalist>
                  <select name="initiative_id" defaultValue={cur.initiative_id || ""}><option value="">No initiative</option>{initiatives.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
                  <select name="store_id" defaultValue={cur.store_id || ""}><option value="">Any store</option>{stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                  <input type="date" name="taken_on" defaultValue={cur.taken_on} />
                  <div className="chips" style={{ maxHeight: 120, overflowY: "auto" }}>
                    {people.map((p) => <label key={p.id} className="chip"><input type="checkbox" name="person_ids" value={p.id} defaultChecked={cur.person_ids.includes(p.id)} />{p.name}</label>)}
                  </div>
                  <textarea name="caption" defaultValue={cur.caption || ""} placeholder="What to notice" />
                  <div className="inline">
                    <button className="btn sm">Save</button>
                    <button type="button" className="btn sm ghost" onClick={() => setEditing(false)}>Cancel</button>
                  </div>
                </form>
              )}
            </aside>
          </div>
        </div>
      )}
    </>
  );
}
