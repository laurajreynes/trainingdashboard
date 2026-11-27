"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Counts page opens and taps on links and buttons, so Laura can see what the stores use. No names, no typing. */
function send(kind: "view" | "click", path: string, label = "") {
  try {
    let vid = localStorage.getItem("hub.vid");
    if (!vid) { vid = Math.random().toString(36).slice(2, 12); localStorage.setItem("hub.vid", vid); }
    const body = JSON.stringify({ site: "hub", path, kind, label, vid });
    if (!(navigator.sendBeacon && navigator.sendBeacon("/api/hit", body))) fetch("/api/hit", { method: "POST", body, keepalive: true }).catch(() => {});
  } catch { /* counting must never break a page */ }
}

export function Track() {
  const path = usePathname() || "/";
  useEffect(() => { if (path !== "/usage" && path !== "/login") send("view", path); }, [path]);
  useEffect(() => {
    const on = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.("a,button,summary,[role=button]") as HTMLElement | null;
      if (!el || el.closest("form")) return;                               // form buttons carry what she typed, skip them
      const label = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40);
      if (label) send("click", location.pathname, label);
    };
    document.addEventListener("click", on, true);
    return () => document.removeEventListener("click", on, true);
  }, []);
  return null;
}
