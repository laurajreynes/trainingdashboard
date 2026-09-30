"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Store } from "@/lib/types";
import { storeAccent } from "@/lib/fmt";

export function StoreNav({ stores }: { stores: Store[] }) {
  const path = usePathname();
  return (
    <nav className="storenav">
      {stores.map((s) => {
        const on = path === `/s/${s.slug}` || path.startsWith(`/s/${s.slug}/`);
        return (
          <Link
            key={s.id}
            href={`/s/${s.slug}`}
            className={on ? "on" : ""}
            style={{ ["--accent" as string]: storeAccent(s) }}
          >
            {s.short_name}
          </Link>
        );
      })}
    </nav>
  );
}
