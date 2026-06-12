"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "light" | "warm";
export type Layout = "auto" | "mobile" | "desktop";

interface ThemeStore {
  theme: Theme;
  layout: Layout;
  setTheme: (t: Theme) => void;
  setLayout: (l: Layout) => void;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  // Remove all theme classes/attrs first
  root.classList.remove("dark");
  root.removeAttribute("data-theme");

  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "warm") {
    root.setAttribute("data-theme", "warm");
  }
  // light = no class / no data-theme (uses :root defaults)
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "dark",
      layout: "auto",
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      setLayout: (layout) => set({ layout }),
    }),
    { name: "threads-theme" }
  )
);
