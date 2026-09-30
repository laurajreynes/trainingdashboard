import Link from "next/link";
import { notFound } from "next/navigation";
import { isEditor } from "@/lib/auth";
import { getStores, getStoreBySlug, storeFamily, getVisits } from "@/lib/data";
import { VisitList } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function StoreVisits({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [store, stores, editor] = await Promise.all([getStoreBySlug(slug), getStores(), isEditor()]);
  if (!store) notFound();
  const family = storeFamily(store, stores);
  const visits = await getVisits({ storeIds: family.map((s) => s.id) });
  return (
    <div style={{ ["--accent" as string]: store.accent }}>
      <div className="pagehead">
        <div>
          <div className="eyebrow"><Link href={`/s/${store.slug}`}>{store.name}</Link></div>
          <h1>Visit log</h1>
        </div>
        {editor && <Link href={`/visit/new?store=${store.slug}`} className="btn gold">Log a visit</Link>}
      </div>
      <div className="card"><VisitList visits={visits} stores={stores} showStore={family.length > 1} /></div>
    </div>
  );
}
