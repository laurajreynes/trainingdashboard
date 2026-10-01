import { redirect } from "next/navigation";
import { isEditor } from "@/lib/auth";
import { getStores, getInitiatives, getPeople } from "@/lib/data";
import { addVisit } from "@/app/actions";
import { VisitFields } from "@/components/VisitForm";

export const dynamic = "force-dynamic";

export default async function NewVisit({ searchParams }: { searchParams: Promise<{ store?: string; plan?: string }> }) {
  if (!(await isEditor())) redirect("/login?next=/visit/new");
  const sp = await searchParams;
  const [stores, initiatives, people] = await Promise.all([getStores(), getInitiatives(), getPeople()]);
  const def = stores.find((s) => s.slug === sp.store)?.id;
  const plan = sp.plan === "1";
  return (
    <>
      <div className="pagehead"><div><div className="eyebrow">{plan ? "Training calendar" : "Visit log"}</div><h1>{plan ? "Schedule a session" : "Log a visit"}</h1></div></div>
      {plan && <p className="muted small" style={{ marginTop: -8, marginBottom: 12 }}>Pick the date and the store, give it a one-line focus. It shows on the calendar, and you fill in the recap after.</p>}
      <form action={addVisit} className="card">
        <VisitFields stores={stores} initiatives={initiatives} people={people} defaultStoreId={def} />
        <button className="btn gold" type="submit">{plan ? "Put it on the calendar" : "Save visit"}</button>
      </form>
    </>
  );
}
