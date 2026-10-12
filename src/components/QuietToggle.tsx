"use client";
import { useEffect, useState } from "react";

/** A small unlabeled switch, bottom right: the quiet view keeps the focus, CarWars, pace and the top setters, and hides the workbench. */
export function QuietToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let v = false; try { v = localStorage.getItem("hub.quiet") === "1"; } catch {}
    setOn(v); document.body.classList.toggle("calm", v);
  }, []);
  const flip = () => {
    const v = !on; setOn(v); document.body.classList.toggle("calm", v);
    try { localStorage.setItem("hub.quiet", v ? "1" : "0"); } catch {}
  };
  return (
    <button type="button" className={`quiet-toggle${on ? " on" : ""}`} onClick={flip} aria-label={on ? "Show everything" : "Show less"} title={on ? "Show everything" : "Show less"}>
      <span />
    </button>
  );
}
