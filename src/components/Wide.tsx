"use client";
import { useEffect } from "react";
/** Lets a page use more of the screen: adds .wide to the main page wrapper while mounted. */
export function Wide() {
  useEffect(() => {
    const m = document.querySelector("main.page"); m?.classList.add("wide");
    return () => m?.classList.remove("wide");
  }, []);
  return null;
}
