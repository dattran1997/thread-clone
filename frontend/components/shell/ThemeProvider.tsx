"use client";
import { useEffect } from "react";
import { useThemeStore } from "@/stores/theme";

/**
 * Reads theme from Zustand (persisted to localStorage) and applies it to <html>.
 * Dark  → adds `.dark` class (enables dark: Tailwind variant)
 * Light → removes `.dark` class, no data-theme (uses :root defaults)
 * Warm  → removes `.dark` class, adds data-theme="warm"
 * Mount once in root layout.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.removeAttribute("data-theme");

    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "warm") {
      root.setAttribute("data-theme", "warm");
    }
    // light = bare :root styles
  }, [theme]);

  return <>{children}</>;
}
