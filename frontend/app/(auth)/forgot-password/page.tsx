"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import { Logo } from "@/components/shell/Logo";
import { Mail, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || loading) return;
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch {
      toast("Something went wrong — please try again", "error");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-[400px] flex flex-col items-center gap-5 text-center">
        <CheckCircle2 size={56} className="text-green-500" />
        <div>
          <h1 className="text-[22px] font-bold text-foreground">Check your inbox</h1>
          <p className="text-[14px] text-muted-foreground mt-2">
            If <strong>{email}</strong> is registered, we&apos;ve sent a password reset link.
            It expires in 1 hour.
          </p>
          <p className="text-[13px] text-muted-foreground mt-2">
            Don&apos;t see it? Check your spam folder.
          </p>
        </div>
        <button
          onClick={() => router.push("/login")}
          className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-[15px] hover:opacity-90 transition-opacity"
        >
          Back to login
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px] space-y-6">
      {/* Logo + heading */}
      <div className="flex flex-col items-center gap-4">
        <Logo size={60} />
        <div className="text-center">
          <h1 className="text-[26px] text-foreground">Forgot password?</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>
      </div>

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <div className="relative">
          <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="email"
            placeholder="Email address"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-input border border-border rounded-xl py-4 pl-10 pr-4 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-primary outline-none transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email}
          className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-[15px] hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-40"
        >
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <button
        onClick={() => router.back()}
        className="w-full text-center text-[14px] text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Back to login
      </button>
    </div>
  );
}
