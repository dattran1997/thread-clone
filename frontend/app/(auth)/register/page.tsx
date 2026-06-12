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

// ── Password strength ────────────────────────────────────────────────────────

interface Rule { label: string; test: (pw: string) => boolean }

const PASSWORD_RULES: Rule[] = [
  { label: "At least 8 characters",      test: (pw) => pw.length >= 8 },
  { label: "Uppercase letter (A–Z)",      test: (pw) => /[A-Z]/.test(pw) },
  { label: "Lowercase letter (a–z)",      test: (pw) => /[a-z]/.test(pw) },
  { label: "Number (0–9)",               test: (pw) => /\d/.test(pw) },
  { label: "Special character (!@#…)",   test: (pw) => /[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?`~]/.test(pw) },
];

const STRENGTH_MAP: Record<number, { label: string; color: string; bar: string }> = {
  0: { label: "",            color: "text-muted-foreground", bar: "bg-muted" },
  1: { label: "Weak",        color: "text-red-500",          bar: "bg-red-500" },
  2: { label: "Fair",        color: "text-orange-500",       bar: "bg-orange-500" },
  3: { label: "Good",        color: "text-yellow-500",       bar: "bg-yellow-500" },
  4: { label: "Strong",      color: "text-green-400",        bar: "bg-green-400" },
  5: { label: "Very strong", color: "text-green-500",        bar: "bg-green-500" },
};

// ── Validation helpers ───────────────────────────────────────────────────────

function validateUsername(v: string) {
  if (!v) return "Username is required";
  if (v.length < 3) return "At least 3 characters";
  if (v.length > 30) return "Max 30 characters";
  if (!/^[a-z0-9_-]+$/.test(v)) return "Only letters, numbers, _ and - are allowed";
  return "";
}

function validateDisplayName(v: string) {
  if (!v.trim()) return "Display name is required";
  if (v.trim().length < 2) return "At least 2 characters";
  if (v.length > 50) return "Max 50 characters";
  return "";
}

function validateEmail(v: string) {
  if (!v) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter a valid email address";
  return "";
}

function validatePassword(v: string) {
  if (!v) return "Password is required";
  if (v.length < 8) return "At least 8 characters";
  return "";
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [form, setForm] = useState({ username: "", displayName: "", email: "", password: "" });
  const [errors, setErrors] = useState({ username: "", displayName: "", email: "", password: "" });
  const [touched, setTouched] = useState({ username: false, displayName: false, email: false, password: false });
  const [loading, setLoading] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const score = PASSWORD_RULES.filter((r) => r.test(form.password)).length;
  const strength = STRENGTH_MAP[score] ?? STRENGTH_MAP[0];

  const inputClass = (field: keyof typeof errors) =>
    cn(
      "w-full bg-input border rounded-xl py-4 px-4 text-[15px] text-foreground placeholder:text-muted-foreground outline-none transition-colors",
      touched[field] && errors[field]
        ? "border-destructive focus:border-destructive"
        : "border-border focus:border-primary",
    );

  function touch(field: keyof typeof touched, value: string) {
    setTouched((t) => ({ ...t, [field]: true }));
    const validators = { username: validateUsername, displayName: validateDisplayName, email: validateEmail, password: validatePassword };
    setErrors((e) => ({ ...e, [field]: validators[field](value) }));
  }

  function validateAll() {
    const e = {
      username:    validateUsername(form.username),
      displayName: validateDisplayName(form.displayName),
      email:       validateEmail(form.email),
      password:    validatePassword(form.password),
    };
    setErrors(e);
    setTouched({ username: true, displayName: true, email: true, password: true });
    return Object.values(e).every((v) => !v);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateAll()) return;
    if (score < PASSWORD_RULES.length) {
      toast("Please choose a stronger password", "error");
      setShowRules(true);
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ user: any; accessToken: string; refreshToken: string }>(
        "/auth/register", form,
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

      <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>

        {/* Username */}
        <div className="flex flex-col gap-1">
          <input
            type="text"
            placeholder="Username"
            autoComplete="username"
            autoFocus
            maxLength={30}
            value={form.username}
            onChange={(e) => {
              const v = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
              setForm({ ...form, username: v });
              if (touched.username) setErrors((er) => ({ ...er, username: validateUsername(v) }));
            }}
            onBlur={() => touch("username", form.username)}
            className={inputClass("username")}
          />
          {touched.username && errors.username && (
            <p className="text-[12px] text-destructive ml-1">{errors.username}</p>
          )}
          <p className="text-[11px] text-muted-foreground ml-1">Letters, numbers, _ and - only</p>
        </div>

        {/* Display name */}
        <div className="flex flex-col gap-1">
          <input
            type="text"
            placeholder="Display name"
            autoComplete="name"
            maxLength={50}
            value={form.displayName}
            onChange={(e) => {
              const v = e.target.value;
              setForm({ ...form, displayName: v });
              if (touched.displayName) setErrors((er) => ({ ...er, displayName: validateDisplayName(v) }));
            }}
            onBlur={() => touch("displayName", form.displayName)}
            className={inputClass("displayName")}
          />
          {touched.displayName && errors.displayName && (
            <p className="text-[12px] text-destructive ml-1">{errors.displayName}</p>
          )}
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1">
          <input
            type="email"
            placeholder="Email address"
            autoComplete="email"
            value={form.email}
            onChange={(e) => {
              const v = e.target.value;
              setForm({ ...form, email: v });
              if (touched.email) setErrors((er) => ({ ...er, email: validateEmail(v) }));
            }}
            onBlur={() => touch("email", form.email)}
            className={inputClass("email")}
          />
          {touched.email && errors.email && (
            <p className="text-[12px] text-destructive ml-1">{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div className="flex flex-col gap-2">
          <input
            type="password"
            placeholder="Password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => {
              const v = e.target.value;
              setForm({ ...form, password: v });
              if (touched.password) setErrors((er) => ({ ...er, password: validatePassword(v) }));
            }}
            onBlur={() => touch("password", form.password)}
            onFocus={() => setShowRules(true)}
            className={inputClass("password")}
          />
          {touched.password && errors.password && (
            <p className="text-[12px] text-destructive ml-1">{errors.password}</p>
          )}

          {/* Strength bar */}
          {form.password.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i}
                    className={cn("h-1 flex-1 rounded-full transition-colors duration-300",
                      i < score ? strength.bar : "bg-border")} />
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
                    {ok
                      ? <Check size={13} className="text-green-500 shrink-0" />
                      : <X size={13} className="text-muted-foreground shrink-0" />}
                    <span className={cn("text-[12px]", ok ? "text-foreground" : "text-muted-foreground")}>
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
          disabled={loading}
          className="w-full py-4 mt-1 rounded-xl bg-primary text-primary-foreground font-bold text-[15px] hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-40"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

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
