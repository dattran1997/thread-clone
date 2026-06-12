"use client";
import { useEffect } from "react";
import { useThemeStore } from "@/stores/theme";

/**
 * Keeps <html> in sync with the Zustand theme store after the page has loaded.
 * The initial theme is applied synchronously by the inline script in layout.tsx
 * (before first paint), so there is no flash on any route including /login.
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
    // light = bare :root styles (no class, no data-theme)
  }, [theme]);

  return <>{children}</>;
}
