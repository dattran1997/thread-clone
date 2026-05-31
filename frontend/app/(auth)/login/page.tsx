"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { toast } from "@/components/ui/Toast";
import { Logo } from "@/components/shell/Logo";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post<{ user: any; accessToken: string; refreshToken: string }>(
        "/auth/login",
        form,
      );
      setAuth(res.user, res.accessToken, res.refreshToken);
      router.replace("/");
    } catch (err: any) {
      toast(err?.message ?? "Login failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="flex flex-col items-center gap-3">
        <Logo size={40} />
        <h1 className="text-2xl font-bold text-[var(--text)]">Log in to Threads</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="Email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
        />
        <input
          type="password"
          placeholder="Password"
          required
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-[var(--accent)] text-[var(--accent-text)] font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="text-center text-sm text-[var(--text2)]">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-[var(--accent)] font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
