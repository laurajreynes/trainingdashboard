import Link from "next/link";
import type { Initiative, InitiativePerson, Store } from "@/lib/types";

/** Toyota and Chevrolet: the BDC gets trained first, then the salespeople. Shows where that sequence stands. */
export function BdcFirst({ store, bdcInit, storeInits, roster, bdcStore }: { store: Store; bdcInit: Initiative; storeInits: Initiative[]; roster: InitiativePerson[]; bdcStore?: Store }) {
  const count = (ids: string[]) => { const rows = roster.filter((r) => ids.includes(r.initiative_id)); const people = new Set(rows.map((r) => r.person_id)); const done = new Set(rows.filter((r) => r.status === "trained" || r.status === "solid").map((r) => r.person_id)); return { t: done.size, n: people.size }; };
  const bdc = count([bdcInit.id]), sales = count(storeInits.map((i) => i.id));
  const bdcDone = bdc.n > 0 && bdc.t >= bdc.n;
  return (
    <div className="seq">
      <span className="eyebrow">Order of work at {store.short_name}</span>
      <div className="seq-steps">
        <div className={`seq-step ${bdcDone ? "done" : "now"}`}>
          <span className="n">1</span>
          <div><strong>BDC first</strong><div className="small muted">{bdcStore ? <Link href={`/s/${bdcStore.slug}`}>{bdcInit.name.split(":")[0]}</Link> : bdcInit.name.split(":")[0]} · {bdc.t} of {bdc.n} trained{bdcDone ? "" : " · in progress"}</div></div>
        </div>
        <span className="seq-arrow">→</span>
        <div className={`seq-step ${bdcDone ? "now" : ""}`}>
          <span className="n">2</span>
          <div><strong>Then the salespeople</strong><div className="small muted">{sales.t} of {sales.n} trained{bdcDone ? " · in progress" : " · not the focus yet"}</div></div>
        </div>
      </div>
    </div>
  );
}
