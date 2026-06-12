import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/shell/ThemeProvider";
import { WsProvider } from "@/components/shell/WsProvider";
import { ToastHost } from "@/components/ui/Toast";
import { ComposeSheet } from "@/components/thread/ComposeSheet";

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
    // SSR default = dark; ThemeProvider overrides client-side via .dark class
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          <WsProvider />
          {children}
          <ToastHost />
          <ComposeSheet />
        </ThemeProvider>
      </body>
    </html>
  );
}
