// Auth layout — no nav, centered content
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg)]">
      {children}
    </div>
  );
}
