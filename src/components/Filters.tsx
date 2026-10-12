"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

/** Dropdown filters that update the URL as soon as one changes. */
export function Filters({ fields, children }: {
  fields: { name: string; value: string; empty: string; options: { value: string; label: string }[] }[];
  children?: React.ReactNode;
}) {
  const router = useRouter(); const path = usePathname(); const sp = useSearchParams();
  const change = (name: string, value: string) => {
    const p = new URLSearchParams(sp.toString());
    if (value) p.set(name, value); else p.delete(name);
    p.delete("view");
    const q = p.toString();
    router.push(q ? `${path}?${q}` : path);
  };
  return (
    <div className="filters">
      {fields.map((f) => (
        <select key={f.name} name={f.name} value={f.value} onChange={(e) => change(f.name, e.target.value)}>
          <option value="">{f.empty}</option>
          {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ))}
      {children}
    </div>
  );
}
