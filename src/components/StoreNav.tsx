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
        const on = path === `/s/${s.slug}` || (path.startsWith(`/s/${s.slug}/`) && !s.locations.some((l) => path === `/s/${s.slug}/at/${l.toLowerCase()}`));
        return (
          <span key={s.id} style={{ display: "contents" }}>
            <Link href={`/s/${s.slug}`} className={on ? "on" : ""} style={{ ["--accent" as string]: storeAccent(s) }}>{s.short_name}</Link>
            {s.locations.map((l) => {
              const href = `/s/${s.slug}/at/${l.toLowerCase()}`;
              return <Link key={l} href={href} className={`sub${path === href ? " on" : ""}`} style={{ ["--accent" as string]: storeAccent(s) }}>{l}</Link>;
            })}
          </span>
        );
      })}
    </nav>
  );
}
