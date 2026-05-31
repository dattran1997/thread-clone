import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/shell/ThemeProvider";
import { WsProvider } from "@/components/shell/WsProvider";
import { ToastHost } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: { default: "Threads", template: "%s · Threads" },
  description: "A text-based social network",
};

export const viewport: Viewport = {
  themeColor: "#101010",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme="dark" is the SSR default; ThemeProvider overrides it client-side
    <html lang="en" data-theme="dark">
      <body className="min-h-screen bg-[var(--bg)] text-[var(--text)] antialiased">
        <ThemeProvider>
          <WsProvider />
          {children}
          <ToastHost />
        </ThemeProvider>
      </body>
    </html>
  );
}
