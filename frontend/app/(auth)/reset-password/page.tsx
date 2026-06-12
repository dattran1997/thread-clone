"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import { Logo } from "@/components/shell/Logo";
import { cn } from "@/lib/utils";
import { Lock, CheckCircle2, XCircle } from "lucide-react";

const RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter",   test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter",   test: (p: string) => /[a-z]/.test(p) },
  { label: "One number",             test: (p: string) => /\d/.test(p) },
  { label: "One special character",  test: (p: string) => /[!@#$%^&*()\-_=+[\]{};':"\\|,.<>/?`~]/.test(p) },
];

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const passedRules = RULES.filter((r) => r.test(password));
  const allRulesPassed = passedRules.length === RULES.length;
  const mismatch = confirm.length > 0 && password !== confirm;

  useEffect(() => {
    if (!token) setError("Invalid reset link — no token found.");
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allRulesPassed || mismatch || loading) return;

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, newPassword: password });
      setDone(true);
      toast("Password reset! Please log in.");
      setTimeout(() => router.push("/login"), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reset link may have expired. Request a new one.");
      setLoading(false);
    }
  }

  const inputCls = "w-full bg-secondary border border-border rounded-xl py-4 px-4 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-primary outline-none transition-colors";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8">
        <Logo size={36} />
      </div>

      <div className="w-full max-w-[400px]">
        {done ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle2 size={56} className="text-green-500" />
            <h1 className="text-[22px] font-bold text-foreground">Password reset!</h1>
            <p className="text-[14px] text-muted-foreground">Redirecting you to login…</p>
          </div>
        ) : error && !token ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <XCircle size={56} className="text-destructive" />
            <h1 className="text-[22px] font-bold text-foreground">Invalid link</h1>
            <p className="text-[14px] text-muted-foreground">{error}</p>
            <button
              onClick={() => router.push("/login")}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground text-[15px] font-semibold hover:opacity-90 transition-opacity"
            >
              Back to login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1 text-center">
              <div className="flex justify-center mb-3">
                <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
                  <Lock size={28} className="text-foreground" />
                </div>
              </div>
              <h1 className="text-[22px] font-bold text-foreground">Set new password</h1>
              <p className="text-[14px] text-muted-foreground">
                Must be at least 8 characters with uppercase, lowercase, number &amp; special character.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={inputCls}
              />

              {/* Strength rules */}
              {password.length > 0 && (
                <div className="flex flex-col gap-1 px-1">
                  {RULES.map((r) => {
                    const ok = r.test(password);
                    return (
                      <div key={r.label} className={cn("flex items-center gap-2 text-[12px] transition-colors", ok ? "text-green-500" : "text-muted-foreground")}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", ok ? "bg-green-500" : "bg-muted-foreground")} />
                        {r.label}
                      </div>
                    );
                  })}
                </div>
              )}

              <input
                type="password"
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className={cn(inputCls, mismatch && "border-destructive")}
              />
              {mismatch && (
                <p className="text-[12px] text-destructive px-1">Passwords don't match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!allRulesPassed || mismatch || loading}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground text-[15px] font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {loading ? "Resetting…" : "Reset password"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-center text-[14px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
