import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Threads",
  description: "A text-based social network",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // data-theme is applied client-side by ThemeProvider (see components/shell/)
    // Default "dark" is set in globals.css :root so there's no flash on first load
    <html lang="en" data-theme="dark">
      <body className="min-h-full bg-[var(--bg)] text-[var(--text)] antialiased">
        {children}
      </body>
    </html>
  );
}
