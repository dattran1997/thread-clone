"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { toast } from "@/components/ui/Toast";
import { Logo } from "@/components/shell/Logo";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Password strength helpers ────────────────────────────────────────────────

interface Rule {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_RULES: Rule[] = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "Uppercase letter (A–Z)", test: (pw) => /[A-Z]/.test(pw) },
  { label: "Lowercase letter (a–z)", test: (pw) => /[a-z]/.test(pw) },
  { label: "Number (0–9)", test: (pw) => /\d/.test(pw) },
  { label: "Special character (!@#…)", test: (pw) => /[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?`~]/.test(pw) },
];

function passwordScore(pw: string): number {
  return PASSWORD_RULES.filter((r) => r.test(pw)).length;
}

const STRENGTH_MAP: Record<number, { label: string; color: string; bar: string }> = {
  0: { label: "", color: "text-muted-foreground", bar: "bg-muted" },
  1: { label: "Weak", color: "text-red-500", bar: "bg-red-500" },
  2: { label: "Fair", color: "text-orange-500", bar: "bg-orange-500" },
  3: { label: "Good", color: "text-yellow-500", bar: "bg-yellow-500" },
  4: { label: "Strong", color: "text-green-400", bar: "bg-green-400" },
  5: { label: "Very strong", color: "text-green-500", bar: "bg-green-500" },
};

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ username: "", displayName: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const score = passwordScore(form.password);
  const strength = STRENGTH_MAP[score] ?? STRENGTH_MAP[0];
  const allRulesPassed = score === PASSWORD_RULES.length;

  const inputClass =
    "w-full bg-input border border-border rounded-xl py-4 px-4 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-primary outline-none transition-colors";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allRulesPassed) {
      toast("Please choose a stronger password", "error");
      return;
    }
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
    <div className="w-full max-w-[400px] space-y-6">
      {/* Logo + heading */}
      <div className="flex flex-col items-center gap-4">
        <Logo size={60} />
        <h1 className="text-[26px] text-foreground text-center">Create your account</h1>
      </div>

      {/* Form */}
      <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username (a–z, 0–9, _)"
          required
          autoComplete="username"
          autoFocus
          pattern="[a-z0-9_]+"
          minLength={3}
          maxLength={30}
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="Display name"
          required
          autoComplete="name"
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          className={inputClass}
        />
        <input
          type="email"
          placeholder="Email address"
          required
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={inputClass}
        />

        {/* Password + strength */}
        <div className="flex flex-col gap-2">
          <input
            type="password"
            placeholder="Password"
            required
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            onFocus={() => setShowRules(true)}
            className={inputClass}
          />

          {/* Strength bar */}
          {form.password.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors duration-300",
                      i < score ? strength.bar : "bg-border",
                    )}
                  />
                ))}
              </div>
              {strength.label && (
                <span className={cn("text-[11px] font-medium shrink-0", strength.color)}>
                  {strength.label}
                </span>
              )}
            </div>
          )}

          {/* Rules checklist */}
          {showRules && form.password.length > 0 && (
            <div className="rounded-xl bg-secondary px-4 py-3 space-y-1.5">
              {PASSWORD_RULES.map((rule) => {
                const ok = rule.test(form.password);
                return (
                  <div key={rule.label} className="flex items-center gap-2">
                    {ok ? (
                      <Check size={13} className="text-green-500 shrink-0" />
                    ) : (
                      <X size={13} className="text-muted-foreground shrink-0" />
                    )}
                    <span
                      className={cn(
                        "text-[12px]",
                        ok ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {rule.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !allRulesPassed}
          className="w-full py-4 mt-2 rounded-xl bg-primary text-primary-foreground font-bold text-[15px] hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-40"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="h-[1px] grow bg-border" />
        <span className="text-[12px] text-muted-foreground">OR</span>
        <div className="h-[1px] grow bg-border" />
      </div>

      <Link
        href="/login"
        className="flex w-full items-center justify-center py-4 rounded-xl border border-border text-[15px] font-semibold text-foreground hover:bg-foreground/5 transition-colors"
      >
        Log in instead
      </Link>

      <p className="text-center text-[12px] text-muted-foreground leading-relaxed">
        By signing up, you agree to our{" "}
        <span className="underline cursor-pointer">Terms</span> and{" "}
        <span className="underline cursor-pointer">Privacy Policy</span>.
      </p>
    </div>
  );
}
