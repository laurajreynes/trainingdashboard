"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** A small unlabeled switch, bottom right: the quiet view keeps the focus, CarWars, pace and the top setters, and hides the workbench. */
export function QuietToggle() {
  const path = usePathname();
  const here = path === "/" || /^\/s\//.test(path || "");
  const [on, setOn] = useState(false);
  useEffect(() => {
    let v = false; try { v = localStorage.getItem("hub.quiet") === "1"; } catch {}
    setOn(v); document.body.classList.toggle("calm", v && here);
    return () => { document.body.classList.remove("calm"); };
  }, [here]);
  const flip = () => {
    const v = !on; setOn(v); document.body.classList.toggle("calm", v);
    try { localStorage.setItem("hub.quiet", v ? "1" : "0"); } catch {}
  };
  if (!here) return null;
  return (
    <button type="button" className={`quiet-toggle${on ? " on" : ""}`} onClick={flip} aria-label={on ? "Show everything" : "Show less"} title={on ? "Show everything" : "Show less"}>
      <span />
    </button>
  );
}
