"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { toast } from "@/components/ui/Toast";
import { DesktopSidebar } from "@/components/shell/DesktopSidebar";
import { MobileNav } from "@/components/shell/MobileNav";
import { BackIcon } from "@/components/ui/Icons";
import { useThemeStore } from "@/stores/theme";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useThemeStore();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [settings, setSettings] = useState({ isPrivate: false });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get<{ isPrivate: boolean }>("/settings").then(setSettings).catch(() => {});
  }, [user]);

  async function saveSettings() {
    setLoading(true);
    try {
      await api.patch("/settings", settings);
      toast("Settings saved");
    } catch { toast("Failed to save", "error"); }
    finally { setLoading(false); }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch("/settings/password", passwords);
      toast("Password changed");
      setPasswords({ currentPassword: "", newPassword: "" });
    } catch (err: any) {
      toast(err?.message ?? "Failed to change password", "error");
    } finally { setLoading(false); }
  }

  async function logout() {
    try { await api.delete("/auth/logout"); } catch {}
    clearAuth();
    router.push("/login");
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex flex-col h-screen sticky top-0 border-r border-[var(--border)]">
        <DesktopSidebar />
      </div>

      <main className="flex-1 max-w-[622px] mx-auto border-r border-[var(--border)] min-h-screen pb-20 lg:pb-0">
        <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-blur)] backdrop-blur-md">
          <button onClick={() => router.back()} className="p-1 text-[var(--text2)]"><BackIcon size={20} /></button>
          <h1 className="text-xl font-bold text-[var(--text)]">Settings</h1>
        </div>

        <div className="p-4 space-y-6">
          {/* Theme */}
          <section>
            <h2 className="font-semibold text-[var(--text)] mb-3">Appearance</h2>
            <div className="flex gap-2">
              {(["dark", "light", "warm"] as const).map((t) => (
                <button key={t} onClick={() => setTheme(t)}
                  className={cn(
                    "flex-1 py-3 rounded-xl border capitalize text-sm font-medium transition-colors",
                    theme === t
                      ? "border-[var(--accent)] bg-[var(--bg2)] text-[var(--text)]"
                      : "border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg2)]",
                  )}>
                  {t}
                </button>
              ))}
            </div>
          </section>

          {/* Privacy */}
          <section>
            <h2 className="font-semibold text-[var(--text)] mb-3">Privacy</h2>
            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg2)]">
              <div>
                <p className="text-sm font-medium text-[var(--text)]">Private account</p>
                <p className="text-xs text-[var(--text2)]">Only approved followers see your threads</p>
              </div>
              <button
                onClick={() => setSettings((s) => ({ ...s, isPrivate: !s.isPrivate }))}
                className={cn(
                  "w-10 h-6 rounded-full transition-colors relative",
                  settings.isPrivate ? "bg-[var(--accent)]" : "bg-[var(--bg3)]",
                )}>
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow",
                  settings.isPrivate ? "left-5" : "left-1",
                )} />
              </button>
            </div>
            <button onClick={saveSettings} disabled={loading}
              className="mt-3 w-full py-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-text)] text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
              Save privacy settings
            </button>
          </section>

          {/* Change password */}
          <section>
            <h2 className="font-semibold text-[var(--text)] mb-3">Change password</h2>
            <form onSubmit={changePassword} className="space-y-2">
              <input type="password" placeholder="Current password" required
                value={passwords.currentPassword}
                onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg2)] border border-[var(--border)] text-sm text-[var(--text)] placeholder:text-[var(--text2)] outline-none focus:ring-1 focus:ring-[var(--accent)]" />
              <input type="password" placeholder="New password (min 8 chars)" required minLength={8}
                value={passwords.newPassword}
                onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg2)] border border-[var(--border)] text-sm text-[var(--text)] placeholder:text-[var(--text2)] outline-none focus:ring-1 focus:ring-[var(--accent)]" />
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-text)] text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
                Change password
              </button>
            </form>
          </section>

          {/* Log out */}
          <section className="pt-4 border-t border-[var(--border)]">
            <button onClick={logout}
              className="w-full py-2.5 rounded-xl border border-red-500 text-red-500 text-sm font-semibold hover:bg-red-500/10 transition-colors">
              Log out
            </button>
          </section>
        </div>
      </main>

      <div className="lg:hidden"><MobileNav /></div>
    </div>
  );
}
