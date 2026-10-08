"use client";

import { useEffect, useState } from "react";

import { MoonIcon, SunIcon } from "@/components/icons";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = localStorage.getItem("chainsettle-theme") as "light" | "dark" | null;
      const initial = saved ?? "dark";
      setTheme(initial);
      document.documentElement.setAttribute("data-theme", initial);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("chainsettle-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <button
      onClick={toggle}
      className="btn-ghost px-2.5 py-1 text-[12px] flex items-center gap-1.5 transition-colors"
      title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
      aria-label="Toggle color theme"
    >
      {theme === "light" ? (
        <>
          <MoonIcon className="w-3.5 h-3.5 text-[var(--color-ash)]" />
          <span className="hidden sm:inline font-mono text-[11px]">Dark</span>
        </>
      ) : (
        <>
          <SunIcon className="w-3.5 h-3.5 text-[var(--color-ash)]" />
          <span className="hidden sm:inline font-mono text-[11px]">Light</span>
        </>
      )}
    </button>
  );
}
