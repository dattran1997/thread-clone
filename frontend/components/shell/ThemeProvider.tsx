"use client";
import { useEffect } from "react";
import { useThemeStore } from "@/stores/theme";

/** Reads theme from Zustand (persisted to localStorage) and applies it to <html>.
 *  Mount once in root layout, inside <html> but before any content. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return <>{children}</>;
}
