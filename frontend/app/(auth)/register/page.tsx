"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { toast } from "@/components/ui/Toast";
import { Logo } from "@/components/shell/Logo";

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({
    username: "", displayName: "", email: "", password: "",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post<{ user: any; accessToken: string; refreshToken: string }>(
        "/auth/register",
        form,
      );
      setAuth(res.user, res.accessToken, res.refreshToken);
      toast("Welcome to Threads! 🎉");
      router.replace("/");
    } catch (err: any) {
      toast(err?.message ?? "Registration failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="flex flex-col items-center gap-3">
        <Logo size={40} />
        <h1 className="text-2xl font-bold text-[var(--text)]">Create your account</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Username (lowercase, no spaces)"
          required
          autoComplete="username"
          pattern="[a-z0-9_]+"
          minLength={3}
          maxLength={30}
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
        />
        <input
          type="text"
          placeholder="Display name"
          required
          autoComplete="name"
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
        />
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
          placeholder="Password (min 8 chars)"
          required
          autoComplete="new-password"
          minLength={8}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-[var(--accent)] text-[var(--accent-text)] font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="text-center text-sm text-[var(--text2)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--accent)] font-medium hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
