"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { toast } from "@/components/ui/Toast";
import { Logo } from "@/components/shell/Logo";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

/** Google OAuth — redirects backend which handles the full OAuth flow */
function handleGoogleLogin() {
  // Strip /api/v1 suffix to get base backend URL, then add the route
  const backendBase = BASE.replace(/\/api\/v1$/, "");
  window.location.href = `${backendBase}/api/v1/auth/google`;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-[400px]" />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justVerified = searchParams.get("verified") === "1";
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUnverifiedEmail(null);
    setLoading(true);
    try {
      const res = await api.post<{ user: any; accessToken: string; refreshToken: string }>(
        "/auth/login",
        form,
      );

      // If email not verified, show notice WITHOUT logging the user in
      if (!res.user.emailVerified) {
        setUnverifiedEmail(form.email);
        return;
      }

      setAuth(res.user, res.accessToken, res.refreshToken);
      router.replace("/");
    } catch (err: any) {
      toast(err?.message ?? "Login failed", "error");
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    if (!unverifiedEmail) return;
    setResending(true);
    try {
      await api.post("/auth/resend-verification", { email: unverifiedEmail });
      toast("Verification link sent — check your inbox");
    } catch {
      toast("Failed to resend — try again", "error");
    } finally {
      setResending(false);
    }
  }

  const inputClass =
    "w-full bg-input border border-border rounded-xl py-4 px-4 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-primary outline-none transition-colors";

  return (
    <div className="w-full max-w-[400px] space-y-8">
      {/* Logo + heading */}
      <div className="flex flex-col items-center gap-4">
        <Logo size={60} />
        <h1 className="text-[26px] text-foreground text-center">Log in to Threads</h1>
      </div>

      {/* Email just verified — green banner */}
      {justVerified && (
        <div className="rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-3">
          <p className="text-[14px] text-green-600 dark:text-green-400 font-medium">
            ✓ Email verified!
          </p>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Your account is active. Log in to get started.
          </p>
        </div>
      )}

      {/* Email not verified notice */}
      {unverifiedEmail && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 space-y-2">
          <p className="text-[14px] text-amber-600 dark:text-amber-400 font-medium">
            Please verify your email first
          </p>
          <p className="text-[13px] text-muted-foreground">
            We sent a verification link to <strong>{unverifiedEmail}</strong>.
            Check your inbox and click the link to activate your account.
          </p>
          <button
            onClick={resendVerification}
            disabled={resending}
            className="text-[13px] text-primary hover:underline disabled:opacity-50"
          >
            {resending ? "Sending…" : "Resend verification email"}
          </button>
        </div>
      )}

      {/* Form */}
      <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email address"
          required
          autoComplete="email"
          autoFocus
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={inputClass}
        />
        <input
          type="password"
          placeholder="Password"
          required
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className={inputClass}
        />
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
            Forgot password?
          </Link>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 mt-1 rounded-xl bg-primary text-primary-foreground font-bold text-[15px] hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-40"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="h-[1px] grow bg-border" />
        <span className="text-[12px] text-muted-foreground">OR</span>
        <div className="h-[1px] grow bg-border" />
      </div>

      {/* Google OAuth */}
      <button
        onClick={handleGoogleLogin}
        className="flex w-full items-center justify-center gap-3 py-4 rounded-xl border border-border text-[15px] font-semibold text-foreground hover:bg-foreground/5 transition-colors"
      >
        {/* Google logo SVG */}
        <svg width="20" height="20" viewBox="0 0 48 48" fill="none" aria-hidden>
          <path d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" fill="#FFC107"/>
          <path d="M6.3 14.7l6.6 4.8C14.5 16.1 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.6 4 24 4c-7.6 0-14.2 4.3-17.7 10.7z" fill="#FF3D00"/>
          <path d="M24 44c5.4 0 10.2-2 13.8-5.3l-6.4-5.4C29.5 35 26.9 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.6 5.1C9.5 39.5 16.3 44 24 44z" fill="#4CAF50"/>
          <path d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4-4.3 5.3l6.4 5.4C37.1 39.1 44 34 44 24c0-1.2-.1-2.3-.4-3.5z" fill="#1976D2"/>
        </svg>
        Continue with Google
      </button>

      {/* Create account */}
      <Link
        href="/register"
        className="flex w-full items-center justify-center py-4 rounded-xl border border-border text-[15px] font-semibold text-foreground hover:bg-foreground/5 transition-colors"
      >
        Create new account
      </Link>

      <p className="text-center text-[12px] text-muted-foreground leading-relaxed">
        By logging in you agree to our{" "}
        <span className="underline cursor-pointer">Terms</span> and{" "}
        <span className="underline cursor-pointer">Privacy Policy</span>
      </p>
    </div>
  );
}
