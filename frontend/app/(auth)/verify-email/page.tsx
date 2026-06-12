"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Logo } from "@/components/shell/Logo";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";

type Status = "idle" | "verifying" | "success" | "error";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>(token ? "verifying" : "idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .post<{ message: string }>("/auth/verify-email", { token })
      .then(() => setStatus("success"))
      .catch((err: any) => {
        setStatus("error");
        setErrorMsg(err?.message ?? "Verification failed");
      });
  }, [token]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setResending(true);
    try {
      await api.post("/auth/resend-verification", { email });
      setResendDone(true);
    } catch {
      // still show success to prevent email enumeration
      setResendDone(true);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="w-full max-w-[400px] space-y-8">
      <div className="flex flex-col items-center gap-4">
        <Logo size={60} />
      </div>

      {/* ── Verifying in progress ── */}
      {status === "verifying" && (
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 size={40} className="text-primary animate-spin" />
          <p className="text-[16px] text-foreground font-medium">Verifying your email…</p>
        </div>
      )}

      {/* ── Success ── */}
      {status === "success" && (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <CheckCircle size={48} className="text-green-500" />
          <h2 className="text-[22px] font-bold text-foreground">Email verified!</h2>
          <p className="text-[14px] text-muted-foreground">Your account is now fully active.</p>
          <button
            onClick={() => router.replace("/login")}
            className="mt-2 w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-[15px] hover:opacity-90 transition-opacity"
          >
            Log in
          </button>
        </div>
      )}

      {/* ── Error ── */}
      {status === "error" && (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <XCircle size={48} className="text-destructive" />
          <h2 className="text-[22px] font-bold text-foreground">Link expired</h2>
          <p className="text-[14px] text-muted-foreground">{errorMsg}</p>
          <button
            onClick={() => setStatus("idle")}
            className="mt-2 w-full py-4 rounded-xl border border-border text-[15px] font-semibold text-foreground hover:bg-foreground/5 transition-colors"
          >
            Resend a new link
          </button>
        </div>
      )}

      {/* ── Idle: awaiting email / resend form ── */}
      {status === "idle" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
              <Mail size={28} className="text-muted-foreground" />
            </div>
            <h2 className="text-[22px] font-bold text-foreground">Check your email</h2>
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              We sent a verification link to your email address.
              Click the link to activate your account.
            </p>
            <p className="text-[13px] text-muted-foreground rounded-xl bg-secondary px-4 py-3">
              <strong>Running locally?</strong> Check the backend console — the link is printed there.
            </p>
          </div>

          {resendDone ? (
            <p className="text-center text-[14px] text-green-500 font-medium">
              New link sent — check your email or console.
            </p>
          ) : (
            <form onSubmit={handleResend} className="flex flex-col gap-2">
              <p className="text-[13px] text-muted-foreground text-center">Didn't receive it?</p>
              <input
                type="email"
                placeholder="Your email address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-input border border-border rounded-xl py-4 px-4 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-primary outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={resending}
                className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-[15px] hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {resending ? "Sending…" : "Resend verification email"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
