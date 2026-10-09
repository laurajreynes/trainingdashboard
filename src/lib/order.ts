import type { Initiative, Store } from "./types";

/** Initiatives in store order (Chevrolet with Belgrade, Toyota together, then BDC, Subaru, Livingston), then by name. */
export function byStore(stores: Store[]) {
  const rank = (i: Initiative) => Math.min(...i.store_ids.map((id) => stores.find((s) => s.id === id)?.sort_order ?? 99), 99);
  return (a: Initiative, b: Initiative) => rank(a) - rank(b) || a.name.localeCompare(b.name);
}
