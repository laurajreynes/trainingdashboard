"use client";

import Link from "next/link";
import { useState } from "react";
import { GOALS, rate, shade } from "@/lib/phones-format";

/** The team lines as the page hands them over: plain data, so they can cross from server to browser. */
export type PhonesRow = {
  team: { key: string; name: string; href: string; color: string };
  io: number; ir: number; fi: number; oc: number; ol: number; os: number;
  perDay: number | null;
  perDayBy: Record<string, number>;
  people: { n: string; io: number; ir: number; fi: number; oc: number; ol: number; os: number }[];
  bdc: string[];
};
type Counts = { io: number; ir: number; fi: number; oc: number; ol: number; os: number };
type Key = "request" | "set" | "calls" | "live" | "appt";

const pct = (n: number, d: number) => (d ? n / d : null);
/** What each column sorts on, then what breaks a tie. A blank (no calls to divide by) always sorts last. */
const ORDER: Record<Key, (c: Counts) => (number | null)[]> = {
  request: (c) => [pct(c.ir, c.io), pct(c.fi, c.ir), c.io],
  set: (c) => [pct(c.fi, c.ir), pct(c.ir, c.io), c.ir],
  calls: (c) => [c.oc, pct(c.ol, c.oc)],
  live: (c) => [pct(c.ol, c.oc), c.oc],
  appt: (c) => [pct(c.os, c.ol), c.ol],
};
function byKey(key: Key) {
  return (a: Counts & { n?: string }, b: Counts & { n?: string }) => {
    const x = ORDER[key](a), y = ORDER[key](b);
    for (let i = 0; i < x.length; i++) {
      if (x[i] === y[i]) continue;
      if (x[i] === null) return 1;
      if (y[i] === null) return -1;
      return (y[i] as number) - (x[i] as number);
    }
    return (a.n || "").localeCompare(b.n || "");
  };
}

const perDay = (n: number) => (n >= 10 ? Math.round(n).toLocaleString() : (Math.round(n * 10) / 10).toString());

function Stat({ n, d, goal, small }: { n: number; d: number; goal: number | null; small?: boolean }) {
  const p = rate(n, d);
  if (p === null) return <div className="phstat"><span className="phpct none">–</span></div>;
  return (
    <div className={`phstat${small ? " sm" : ""}`}>
      <span className={`phpct ${shade(p, d, goal)}`}>{p}%</span>
      <span className="phof">{n} of {d}</span>
    </div>
  );
}

function Calls({ calls, daily, small }: { calls: number; daily: number | null | undefined; small?: boolean }) {
  if (!calls) return <div className="phstat"><span className="phpct none">–</span></div>;
  return (
    <div className={`phstat${small ? " sm" : ""}`}>
      <span className="phpct">{calls.toLocaleString()}</span>
      {daily != null && <span className="phof">{perDay(daily)} a day</span>}
    </div>
  );
}

const COLS: { key: Key; label: string; goal?: number | null; title: string }[] = [
  { key: "request", label: "Request", goal: GOALS.request, title: "Asked for the appointment, out of inbound sales calls" },
  { key: "set", label: "Set", goal: GOALS.set, title: "Firm appointments, out of the calls where one was requested" },
  { key: "calls", label: "Calls", title: "Outbound calls this month, and per selling day" },
  { key: "live", label: "Live convo", title: "Live conversations, out of outbound calls" },
  { key: "appt", label: "Appt set", title: "Appointments set, out of live conversations" },
];

/**
 * Team lines that open to their people. People rank by request, then set, unless a column header is clicked:
 * then teams and people both rank highest to lowest on that column. Clicking it again goes back to the usual order.
 */
export default function PhonesTable({ rows }: { rows: PhonesRow[] }) {
  const [sort, setSort] = useState<Key | null>(null);
  const teams = sort ? [...rows].sort((a, b) => byKey(sort)({ ...a, n: a.team.name }, { ...b, n: b.team.name })) : rows;
  const people = byKey(sort || "request");

  return (
    <section className="card phones">
      <div className="phrow phgroups" aria-hidden="true">
        <div className="phteam" />
        <div className="phspan two">Inbound sales calls</div>
        <div className="phspan three">Outbound</div>
      </div>
      <div className="phrow phhead" role="row">
        <div className="phteam" />
        {COLS.map((c) => (
          <button
            key={c.key}
            type="button"
            role="columnheader"
            className={`phsort${sort === c.key ? " on" : ""}`}
            aria-sort={sort === c.key ? "descending" : "none"}
            title={`${c.title}. Click to rank highest to lowest.`}
            onClick={() => setSort(sort === c.key ? null : c.key)}
          >
            <span>{c.label}</span>
            {c.goal != null && <span className="phgoal">goal {c.goal}%</span>}
            <i className="pharrow" aria-hidden="true" />
          </button>
        ))}
      </div>
      {teams.map((r) => {
        const bdc = new Set(r.bdc);
        return (
          <details className="phteamrow" key={r.team.key} style={{ ["--accent" as string]: r.team.color }}>
            <summary className="phrow">
              <div className="phteam"><i className="phdot" />{r.team.name}</div>
              <Stat n={r.ir} d={r.io} goal={GOALS.request} />
              <Stat n={r.fi} d={r.ir} goal={GOALS.set} />
              <Calls calls={r.oc} daily={r.perDay} />
              <Stat n={r.ol} d={r.oc} goal={GOALS.live} />
              <Stat n={r.os} d={r.ol} goal={GOALS.appt} />
            </summary>
            <div className="phpeople">
              {r.people.length ? [...r.people].sort(people).map((p) => (
                <div className="phrow person" key={p.n}>
                  <div className="phteam">{p.n}{bdc.has(p.n) && <span className="tag" style={{ marginLeft: 6 }}>BDC</span>}</div>
                  <Stat small n={p.ir} d={p.io} goal={null} />
                  <Stat small n={p.fi} d={p.ir} goal={null} />
                  <Calls small calls={p.oc} daily={r.perDayBy[p.n]} />
                  <Stat small n={p.ol} d={p.oc} goal={null} />
                  <Stat small n={p.os} d={p.ol} goal={null} />
                </div>
              )) : <p className="empty">No calls yet this month</p>}
              <div className="phfoot small">
                {bdc.size > 0 && <span className="faint">Outbound on the team line counts the sales floor.</span>}
                <Link href={r.team.href} style={{ marginLeft: "auto" }}>{r.team.name} page</Link>
              </div>
            </div>
          </details>
        );
      })}
    </section>
  );
}
