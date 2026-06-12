"use client";

// ─────────────────────────────────────────────────────────────────────────────
// /auth/callback — Google OAuth redirect handler
// Backend redirects here after Google authentication with tokens in URL params:
//   /auth/callback?accessToken=xxx&refreshToken=xxx
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");

    if (!accessToken || !refreshToken) {
      toast("OAuth login failed — missing tokens", "error");
      router.replace("/login");
      return;
    }

    // Temporarily store tokens so the next api call can attach them
    const tempStore = {
      state: { accessToken, refreshToken, user: null },
      version: 0,
    };
    localStorage.setItem("threads-auth", JSON.stringify(tempStore));

    // Fetch the logged-in user profile
    api
      .get<{
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
        role: string;
        emailVerified: boolean;
      }>("/users/me")
      .then((user) => {
        setAuth(user, accessToken, refreshToken);
        toast(`Welcome, ${user.displayName}! 👋`);
        router.replace("/");
      })
      .catch(() => {
        localStorage.removeItem("threads-auth");
        toast("Failed to load account — please try again", "error");
        router.replace("/login");
      });
  }, [searchParams, router, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 size={36} className="text-primary animate-spin" />
        <p className="text-[15px] text-muted-foreground">Logging you in…</p>
      </div>
    </div>
  );
}
