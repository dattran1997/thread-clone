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
    <div className="w-full max-w-[400px] flex flex-col items-center gap-6 px-4">
      {/* Logo */}
      <Logo size={60} />

      {/* Heading */}
      <h1 className="text-[26px] font-bold text-white tracking-tight text-center">
        Log in to Threads
      </h1>

      {/* Inputs */}
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2">
        <input
          type="email"
          placeholder="Email address"
          required
          autoComplete="email"
          autoFocus
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full px-4 py-4 rounded-xl bg-[#1a1a1a] border border-[rgba(255,255,255,0.15)] text-white placeholder:text-[#666] text-[15px] focus:outline-none focus:border-[rgba(255,255,255,0.4)] transition-colors"
        />
        <input
          type="password"
          placeholder="Password"
          required
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full px-4 py-4 rounded-xl bg-[#1a1a1a] border border-[rgba(255,255,255,0.15)] text-white placeholder:text-[#666] text-[15px] focus:outline-none focus:border-[rgba(255,255,255,0.4)] transition-colors"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 mt-1 rounded-xl bg-white text-black font-bold text-[15px] hover:bg-[#e8e8e8] active:bg-[#d0d0d0] transition-colors disabled:opacity-40"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      {/* Divider */}
      <div className="w-full flex items-center gap-3">
        <div className="flex-1 h-px bg-[rgba(255,255,255,0.12)]" />
        <span className="text-[13px] text-[#666] font-medium">OR</span>
        <div className="flex-1 h-px bg-[rgba(255,255,255,0.12)]" />
      </div>

      {/* Create account box — matches real Threads */}
      <Link
        href="/register"
        className="w-full py-4 rounded-xl border border-[rgba(255,255,255,0.15)] text-center text-[15px] font-semibold text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors"
      >
        Create new account
      </Link>

      <p className="text-[12px] text-[#555] text-center leading-relaxed pb-4">
        By logging in, you agree to our{" "}
        <span className="underline cursor-pointer">Terms</span> and{" "}
        <span className="underline cursor-pointer">Privacy Policy</span>.
      </p>
    </div>
  );
}
