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
    // suppressHydrationWarning: the inline script mutates className before React hydrates
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Runs synchronously before first paint — reads localStorage and applies theme
            so there is zero flash and no dependency on Zustand rehydration timing. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=JSON.parse(localStorage.getItem('threads-theme')||'{}');var t=(s.state&&s.state.theme)||'dark';var r=document.documentElement;r.classList.remove('dark');r.removeAttribute('data-theme');if(t==='dark')r.classList.add('dark');else if(t==='warm')r.setAttribute('data-theme','warm');}catch(e){document.documentElement.classList.add('dark');}})();`,
          }}
        />
      </head>
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
