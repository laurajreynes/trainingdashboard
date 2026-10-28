import Link from "next/link";

/** Sales / Service switch at the top right of a store page. Sales is the default view. */
export function SideToggle({ slug, side }: { slug: string; side: "sales" | "service" }) {
  return (
    <nav className="sidetoggle" aria-label="Department">
      <Link href={`/s/${slug}`} className={side === "sales" ? "on" : ""} aria-current={side === "sales" ? "page" : undefined}>Sales</Link>
      <Link href={`/s/${slug}?side=service`} className={side === "service" ? "on" : ""} aria-current={side === "service" ? "page" : undefined}>Service</Link>
    </nav>
  );
}
