import { redirect } from "next/navigation";
import { isEditor } from "@/lib/auth";
import { getStores, getInitiatives, getPeople } from "@/lib/data";
import { addVisit } from "@/app/actions";
import { VisitFields } from "@/components/VisitForm";

export const dynamic = "force-dynamic";

export default async function NewVisit({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  if (!(await isEditor())) redirect("/login?next=/visit/new");
  const sp = await searchParams;
  const [stores, initiatives, people] = await Promise.all([getStores(), getInitiatives(), getPeople()]);
  const def = stores.find((s) => s.slug === sp.store)?.id;
  return (
    <>
      <div className="pagehead"><div><div className="eyebrow">Visit log</div><h1>Log a visit</h1></div></div>
      <form action={addVisit} className="card">
        <VisitFields stores={stores} initiatives={initiatives} people={people} defaultStoreId={def} />
        <button className="btn gold" type="submit">Save visit</button>
      </form>
    </>
  );
}
