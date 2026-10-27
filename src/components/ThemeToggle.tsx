"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./icons";

export const THEME_KEY = "ff-theme";

/** Runs before paint (inlined in <head>) so the page never flashes the wrong theme. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.add(d?'th-dark':'th-light')}catch(e){document.documentElement.classList.add('th-light')}})()`;

export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("th-dark"));
  }, []);

  function toggle() {
    const next = !dark;
    const root = document.documentElement;
    root.classList.toggle("th-dark", next);
    root.classList.toggle("th-light", !next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {}
    setDark(next);
  }

  return (
    <button type="button" onClick={toggle} className="btn btn-ghost btn-sm" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
      {dark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
      <span className="muted">{dark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
