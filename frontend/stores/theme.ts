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

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "dark",
      layout: "auto",
      setTheme: (theme) => {
        document.documentElement.setAttribute("data-theme", theme);
        set({ theme });
      },
      setLayout: (layout) => set({ layout }),
    }),
    { name: "threads-theme" }
  )
);

/** Call once in root layout to apply persisted theme on mount */
export function applyStoredTheme() {
  const raw = localStorage.getItem("threads-theme");
  if (!raw) return;
  try {
    const { state } = JSON.parse(raw) as { state: { theme: Theme } };
    if (state?.theme) document.documentElement.setAttribute("data-theme", state.theme);
  } catch {}
}
