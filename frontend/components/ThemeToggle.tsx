"use client";

import { useEffect, useState } from "react";

type Mode = "system" | "light" | "dark";
const OPTIONS: { key: Mode; label: string }[] = [
  { key: "system", label: "跟隨系統" },
  { key: "light", label: "淺色" },
  { key: "dark", label: "深色" },
];

/** 三個選項直接點選，不用反覆點同一個按鈕輪流切換 */
export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") setMode(saved);
    } catch {}
  }, []);

  const apply = (m: Mode) => {
    setMode(m);
    const root = document.documentElement;
    try {
      if (m === "system") {
        root.removeAttribute("data-theme");
        localStorage.removeItem("theme");
      } else {
        root.setAttribute("data-theme", m);
        localStorage.setItem("theme", m);
      }
    } catch {}
  };

  return (
    <div className="seg" role="radiogroup" aria-label="外觀">
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={mode === o.key}
          className={mode === o.key ? "seg-btn is-on" : "seg-btn"}
          onClick={() => apply(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
