import Link from "next/link";
import { notFound } from "next/navigation";
import { isEditor } from "@/lib/auth";
import { getStoreBySlug, getStores, getPeople, getMetrics, getBookmarks, getVisits, getAllRoster, getInitiatives } from "@/lib/data";
import { storeAccent, monthName, monthsBack, today, fmtDate } from "@/lib/fmt";
import { monthPhase } from "@/lib/month";
import { StackedColumns, DotGrid } from "@/components/charts";
import { VisitList } from "@/components/ui";

export const dynamic = "force-dynamic";

/** A location inside a store (Danhof, Belgrade): its own numbers and people, still part of the parent store. */
export default async function LocationPage({ params }: { params: Promise<{ slug: string; loc: string }> }) {
  const { slug, loc } = await params;
  const [store, stores, editor] = await Promise.all([getStoreBySlug(slug), getStores(), isEditor()]);
  if (!store) notFound();
  const location = store.locations.find((l) => l.toLowerCase() === loc.toLowerCase());
  if (!location) notFound();
  const [people, metrics, bookmarks, visits, roster, initiatives] = await Promise.all([
    getPeople([store.id]), getMetrics({ storeIds: [store.id], periods: monthsBack(9) }), getBookmarks([store.id]), getVisits({ storeIds: [store.id], limit: 100 }), getAllRoster(), getInitiatives(),
  ]);
  const here = people.filter((p) => p.active && p.location === location);
  const ids = new Set(here.map((p) => p.id));
  const mi = monthPhase();
  const rows = metrics.filter((m) => m.location === location);
  const months = monthsBack(9);
  const stack = months.map((m) => {
    const r = rows.find((x) => x.period === m);
    return { label: monthName(m).slice(0, 3), hint: monthName(m), parts: [{ label: "New", value: r?.new_sold ?? 0 }, { label: "Used", value: r?.used_sold ?? (r ? r.sold : 0) }] };
  });
  const showMonth = mi.phase === "reflect" ? mi.prevMonth : mi.month;
  const cur = rows.find((x) => x.period === showMonth);
  const reports = bookmarks.filter((b) => b.kind === "report" && b.title.toLowerCase().includes(location.toLowerCase()));
  const touched = new Set(visits.filter((v) => v.date >= mi.monthStart && v.date <= today()).flatMap((v) => v.people_ids));
  const hereVisits = visits.filter((v) => v.date <= today() && (v.people_ids.some((id) => ids.has(id)) || (v.focus || "").toLowerCase().includes(location.toLowerCase()))).slice(0, 6);
  const active = new Set(initiatives.filter((i) => i.status === "active" && i.store_ids.includes(store.id)).map((i) => i.id));
  const trained = here.filter((p) => roster.some((r) => r.person_id === p.id && active.has(r.initiative_id) && (r.status === "trained" || r.status === "solid"))).length;

  return (
    <div style={{ ["--accent" as string]: storeAccent(store) }}>
      <div className="pagehead">
        <div>
          <div className="accentbar" />
          <div className="eyebrow"><Link href={`/s/${store.slug}`}>{store.short_name}</Link> · location</div>
          <h1>{location}</h1>
          <div className="sub small"><Link href={`/people?store=${store.slug}`}>{here.length} people</Link></div>
        </div>
        {editor && <Link href={`/visit/new?store=${store.slug}`} className="btn gold">Log a visit</Link>}
      </div>

      <div className="kpis">
        {cur && <div className="kpi"><div><div className="v">{cur.sold}</div><div className="l">sold in {monthName(showMonth)}</div></div></div>}
        <div className="kpi"><div><div className="v">{here.length}</div><div className="l">people</div></div></div>
        {trained > 0 && <div className="kpi"><div><div className="v">{trained}</div><div className="l">trained on active initiatives</div></div></div>}
      </div>

      {reports.length > 0 && (
        <div className="bookmarks" style={{ marginBottom: 18 }}>
          {reports.map((b) => <a key={b.id} className="bookmark" href={b.url} target="_blank" rel="noreferrer"><span className="k">report</span>{b.title}</a>)}
        </div>
      )}

      <div className="grid cols-2" style={{ marginBottom: 20 }}>
        <section className="card">
          <div className="cardhead"><h2>Sold by month</h2></div>
          <StackedColumns points={stack} colors={[storeAccent(store), "var(--sage)"]} />
        </section>
        <section className="card">
          <div className="cardhead"><h2>Reached in {monthName(mi.month)}</h2></div>
          <DotGrid groups={[{ label: location, color: storeAccent(store), people: here.map((p) => ({ name: p.name, on: touched.has(p.id), href: `/p/${p.id}` })) }]} />
        </section>
      </div>

      <div className="grid main-side">
        <section className="card">
          <div className="cardhead"><h2>People</h2></div>
          <div className="chips">{here.map((p) => <Link key={p.id} href={`/p/${p.id}`} className="chip">{p.name}</Link>)}</div>
          {!here.length && <p className="empty">No one tagged to {location} yet. Set a person&apos;s location on the People page.</p>}
        </section>
        <section className="card">
          <div className="cardhead"><h2>Visits here</h2></div>
          <VisitList visits={hereVisits} stores={stores} people={people} />
          {hereVisits[0] && <p className="faint small" style={{ marginTop: 8 }}>Last: {fmtDate(hereVisits[0].date)}</p>}
        </section>
      </div>
    </div>
  );
}
