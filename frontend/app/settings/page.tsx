"use client";
import { useState, useEffect, useRef } from "react";
import {
  ChevronRight, Shield, User, Bell, EyeOff, HelpCircle, LogOut,
  Languages, Check, Palette, Lock, ShieldCheck, Smartphone,
  Key, AtSign, MicOff, Ban, FileText, Info, AlertTriangle,
  ShieldAlert, FileQuestion, Monitor, MoreHorizontal, X, Plus,
  Camera, Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useThemeStore } from "@/stores/theme";
import { toast } from "@/components/ui/Toast";
import { Avatar } from "@/components/ui/Avatar";
import { DesktopSidebar } from "@/components/shell/DesktopSidebar";
import { MobileNav } from "@/components/shell/MobileNav";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewState =
  | "main" | "appearance" | "personal-info" | "security" | "language"
  | "notifications" | "privacy" | "help" | "about"
  | "security-password" | "security-forgot-password" | "security-2fa"
  | "security-login-activity" | "security-saved-login"
  | "notifications-threads" | "notifications-following"
  | "notifications-messages" | "notifications-system"
  | "privacy-mentions" | "privacy-muted" | "privacy-hidden" | "privacy-blocked"
  | "help-report" | "help-center" | "help-security" | "help-support"
  | "about-privacy" | "about-terms" | "about-libraries";

// ─── Shared sub-components ────────────────────────────────────────────────────

function SubPageHeader({
  title, onBack, action,
}: { title: string; onBack: () => void; action?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/90 backdrop-blur-xl px-4 py-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-foreground hover:text-muted-foreground transition-colors">
          <ChevronRight size={22} className="rotate-180" />
        </button>
        <h1 className="text-[18px] font-semibold text-foreground">{title}</h1>
      </div>
      {action}
    </div>
  );
}

function SettingItem({
  icon, label, value, onClick, danger = false, disabled = false, hideChevron = false,
}: {
  icon?: React.ReactNode; label: string; value?: string;
  onClick?: () => void; danger?: boolean; disabled?: boolean; hideChevron?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center justify-between px-6 py-4 transition-colors",
        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-foreground/5 active:bg-foreground/10",
      )}
    >
      <div className="flex items-center gap-4">
        {icon && (
          <span className={danger ? "text-destructive" : "text-foreground"}>
            {icon}
          </span>
        )}
        <span className={cn("text-[16px]", danger ? "text-destructive" : "text-foreground")}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-[14px] text-muted-foreground">{value}</span>}
        {!hideChevron && <ChevronRight size={18} className="text-muted-foreground" />}
      </div>
    </button>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
      className={cn(
        "relative w-11 h-6 rounded-full transition-colors shrink-0",
        disabled ? "opacity-50 cursor-not-allowed" : "",
        checked ? "bg-primary" : "bg-muted",
      )}
    >
      <div
        className={cn(
          "absolute top-0.5 w-5 h-5 rounded-full bg-background shadow-sm transition-transform",
          checked ? "left-[calc(100%-22px)]" : "left-0.5",
        )}
      />
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-6 py-3 text-[13px] uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { theme, setTheme } = useThemeStore();

  const [view, setView] = useState<ViewState>("main");

  // ── Personal info form state ─────────────────────────────────────────────
  const updateUser = useAuthStore((s) => s.updateUser);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName ?? "",
    bio: "",
    link: "",
    notes: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

  // ── Settings from API ────────────────────────────────────────────────────
  const [isPrivate, setIsPrivate] = useState(false);
  const [hiddenWords, setHiddenWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState("");
  const [addingWord, setAddingWord] = useState(false);

  // Password form
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);

  // Local UI toggles
  const [twoFactorApp, setTwoFactorApp] = useState(true);
  const [saveLogin, setSaveLogin] = useState(true);
  const [pauseNotifs, setPauseNotifs] = useState(false);
  const [language, setLanguage] = useState<"English" | "Tiếng Việt">("English");
  const [activeSessionMenu, setActiveSessionMenu] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<{ isPrivate: boolean }>("/settings").then((s) => setIsPrivate(s.isPrivate)).catch(() => {});
    api.get<{ words: string[] }>("/settings/hidden-words").then((r) => setHiddenWords(r.words)).catch(() => {});
  }, [user]);

  // Load full profile when entering personal-info view
  useEffect(() => {
    if (view !== "personal-info" || !user) return;
    api.get<{
      displayName: string; bio: string | null; links: string[]; notes: string | null;
    }>(`/users/${user.username}`).then((p) => {
      setProfileForm({
        displayName: p.displayName ?? "",
        bio: p.bio ?? "",
        link: p.links?.[0] ?? "",
        notes: p.notes ?? "",
      });
    }).catch(() => {});
  }, [view, user]);

  async function savePrivacy() {
    try {
      await api.patch("/settings", { isPrivate });
      toast("Privacy settings saved");
    } catch { toast("Failed to save", "error"); }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.next !== pw.confirm) { toast("Passwords don't match", "error"); return; }
    setPwLoading(true);
    try {
      await api.patch("/settings/password", { currentPassword: pw.current, newPassword: pw.next });
      toast("Password changed");
      setPw({ current: "", next: "", confirm: "" });
      setView("security");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to change password", "error");
    } finally { setPwLoading(false); }
  }

  async function addHiddenWord() {
    const w = newWord.trim().toLowerCase();
    if (!w || hiddenWords.includes(w)) return;
    setAddingWord(true);
    try {
      const r = await api.post<{ words: string[] }>("/settings/hidden-words", { word: w });
      setHiddenWords(r.words);
      setNewWord("");
      toast("Word added");
    } catch { toast("Failed to add word", "error"); }
    finally { setAddingWord(false); }
  }

  async function removeHiddenWord(word: string) {
    try {
      const r = await api.delete<{ words: string[] }>(`/settings/hidden-words/${encodeURIComponent(word)}`);
      setHiddenWords(r.words);
      toast("Word removed");
    } catch { toast("Failed to remove word", "error"); }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast("Only image files allowed", "error"); return; }
    if (file.size > 5 * 1024 * 1024) { toast("Image must be under 5 MB", "error"); return; }

    // Show preview immediately
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setAvatarUploading(true);

    try {
      const stored = localStorage.getItem("threads-auth");
      const token = stored ? JSON.parse(stored)?.state?.accessToken : null;
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${BASE}/users/me/avatar`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data: { avatarUrl: string } = await res.json();
      // Update auth store so avatar appears everywhere
      updateUser({ avatarUrl: data.avatarUrl });
      // Keep the live preview (already showing)
      toast("Profile photo updated");
    } catch {
      setAvatarPreview(null);
      toast("Failed to upload photo", "error");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function saveProfile() {
    if (profileSaving) return;
    setProfileSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (profileForm.displayName.trim()) body.displayName = profileForm.displayName.trim();
      if (profileForm.bio !== undefined) body.bio = profileForm.bio;
      if (profileForm.notes !== undefined) body.notes = profileForm.notes;
      // Wrap single link into array, validated as URL on backend
      const linkTrimmed = profileForm.link.trim();
      body.links = linkTrimmed
        ? [linkTrimmed.startsWith("http") ? linkTrimmed : `https://${linkTrimmed}`]
        : [];

      await api.patch("/users/me", body);
      // Reflect displayName change in nav/header immediately
      if (body.displayName) updateUser({ displayName: body.displayName as string });
      toast("Profile saved");
      setView("main");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to save", "error");
    } finally {
      setProfileSaving(false);
    }
  }

  async function logout() {
    try { await api.delete("/auth/logout"); } catch {}
    clearAuth();
    router.push("/login");
  }

  if (!user) return null;

  const inputCls =
    "w-full bg-secondary border border-border rounded-xl py-4 px-4 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-primary outline-none transition-colors";

  const btnPrimary = (disabled = false) =>
    cn(
      "w-full py-4 rounded-xl text-[15px] font-bold transition-opacity",
      disabled
        ? "bg-primary/40 text-primary-foreground/60 cursor-not-allowed"
        : "bg-primary text-primary-foreground hover:opacity-90",
    );

  // ── Sub-view renderers ──────────────────────────────────────────────────────

  if (view === "personal-info") return (
    <PageShell>
      {/* Hidden file input for avatar */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />

      <SubPageHeader
        title="Personal information"
        onBack={() => { setView("main"); setAvatarPreview(null); }}
        action={
          <button
            onClick={saveProfile}
            disabled={profileSaving}
            className="text-[15px] font-medium text-primary hover:opacity-80 disabled:opacity-40"
          >
            {profileSaving ? "Saving…" : "Save"}
          </button>
        }
      />

      <div className="flex flex-col py-6 px-6 gap-6">
        {/* Avatar picker */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar
              src={avatarPreview ?? user.avatarUrl}
              alt={user.displayName}
              size={96}
            />
            {/* Camera overlay */}
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 hover:opacity-100 transition-opacity disabled:cursor-wait"
              title="Change photo"
            >
              {avatarUploading
                ? <Loader2 size={24} className="text-white animate-spin" />
                : <Camera size={24} className="text-white" />
              }
            </button>
          </div>
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            className="text-[15px] font-medium text-primary hover:opacity-80 disabled:opacity-40 transition-opacity"
          >
            {avatarUploading ? "Uploading…" : "Change profile photo"}
          </button>
        </div>

        {/* Form fields */}
        <div className="flex flex-col gap-4">
          <Field label="Name">
            <input
              value={profileForm.displayName}
              onChange={(e) => setProfileForm((f) => ({ ...f, displayName: e.target.value }))}
              maxLength={50}
              placeholder="Your name"
              className={inputCls}
            />
          </Field>

          <Field label="Username">
            <input
              value={user.username}
              readOnly
              className={cn(inputCls, "opacity-50 cursor-not-allowed")}
            />
            <p className="text-[12px] text-muted-foreground ml-1">
              Username changes coming soon
            </p>
          </Field>

          <Field label="Bio">
            <textarea
              value={profileForm.bio}
              onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))}
              rows={3}
              maxLength={160}
              placeholder="Write a bio…"
              className={cn(inputCls, "resize-none")}
            />
            <p className="text-right text-[12px] text-muted-foreground">
              {160 - profileForm.bio.length}
            </p>
          </Field>

          <Field label="Link">
            <input
              value={profileForm.link}
              onChange={(e) => setProfileForm((f) => ({ ...f, link: e.target.value }))}
              placeholder="yoursite.com"
              className={inputCls}
            />
          </Field>

          <Field label="Notes">
            <input
              value={profileForm.notes}
              onChange={(e) => setProfileForm((f) => ({ ...f, notes: e.target.value }))}
              maxLength={60}
              placeholder="Short note shown on your profile…"
              className={inputCls}
            />
            <p className="text-right text-[12px] text-muted-foreground">
              {60 - profileForm.notes.length}
            </p>
          </Field>
        </div>

        <button
          onClick={saveProfile}
          disabled={profileSaving}
          className={btnPrimary(profileSaving)}
        >
          {profileSaving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </PageShell>
  );

  if (view === "appearance") return (
    <PageShell>
      <SubPageHeader title="Appearance" onBack={() => setView("main")} />
      <div className="flex flex-col py-2">
        <SectionLabel>Theme</SectionLabel>
        {(["dark", "light", "warm"] as const).map((t) => (
          <button key={t} onClick={() => setTheme(t)}
            className="flex w-full items-center justify-between px-6 py-4 hover:bg-foreground/5 transition-colors">
            <span className="text-[16px] text-foreground capitalize">{t}</span>
            {theme === t && <Check size={18} className="text-primary" />}
          </button>
        ))}
      </div>
    </PageShell>
  );

  if (view === "language") return (
    <PageShell>
      <SubPageHeader title="Language" onBack={() => setView("main")} />
      <div className="flex flex-col py-2">
        {(["English", "Tiếng Việt"] as const).map((lang) => (
          <button key={lang} onClick={() => { setLanguage(lang); setView("main"); }}
            className="flex w-full items-center justify-between px-6 py-4 hover:bg-foreground/5 transition-colors">
            <span className="text-[16px] text-foreground">{lang}</span>
            {language === lang && <Check size={18} className="text-primary" />}
          </button>
        ))}
      </div>
    </PageShell>
  );

  if (view === "security") return (
    <PageShell>
      <SubPageHeader title="Security" onBack={() => setView("main")} />
      <div className="flex flex-col py-2">
        <SettingItem icon={<Lock size={22} />} label="Password" onClick={() => setView("security-password")} />
        <SettingItem icon={<ShieldCheck size={22} />} label="Two-factor authentication" onClick={() => setView("security-2fa")} />
        <SettingItem icon={<Smartphone size={22} />} label="Login activity" onClick={() => setView("security-login-activity")} />
        <SettingItem icon={<Key size={22} />} label="Saved login info" onClick={() => setView("security-saved-login")} />
      </div>
    </PageShell>
  );

  if (view === "security-password") return (
    <PageShell>
      <SubPageHeader title="Password" onBack={() => setView("security")} />
      <form onSubmit={changePassword} className="flex flex-col px-6 py-6 gap-4">
        <p className="text-[14px] text-muted-foreground">
          Password must be at least 8 characters. Use a combination of letters, numbers and symbols.
        </p>
        <input type="password" placeholder="Current password" required value={pw.current}
          onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} className={inputCls} />
        <input type="password" placeholder="New password" required minLength={8} value={pw.next}
          onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} className={inputCls} />
        <input type="password" placeholder="New password, again" required value={pw.confirm}
          onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} className={inputCls} />
        <button type="submit" disabled={pwLoading} className={btnPrimary(pwLoading)}>
          {pwLoading ? "Saving…" : "Change password"}
        </button>
        <button type="button" onClick={() => setView("security-forgot-password")}
          className="text-primary text-[14px] hover:underline text-left">
          Forgotten your password?
        </button>
      </form>
    </PageShell>
  );

  if (view === "security-forgot-password") return (
    <PageShell>
      <SubPageHeader title="Forgot password" onBack={() => setView("security-password")} />
      <div className="flex flex-col items-center text-center gap-4 py-8 px-6">
        <div className="w-20 h-20 rounded-full border-2 border-primary flex items-center justify-center mb-2">
          <Lock size={36} className="text-primary" />
        </div>
        <h2 className="text-[20px] font-medium text-foreground">Trouble logging in?</h2>
        <p className="text-[14px] text-muted-foreground">
          Enter your email and we&apos;ll send a link to get back into your account.
        </p>
        <input type="email" placeholder="Email address" className={cn(inputCls, "w-full mt-2")} />
        <button onClick={() => toast("Reset link sent")} className={btnPrimary()}>
          Send reset link
        </button>
      </div>
    </PageShell>
  );

  if (view === "security-2fa") return (
    <PageShell>
      <SubPageHeader title="Two-factor authentication" onBack={() => setView("security")} />
      <div className="flex flex-col py-4">
        <p className="px-6 pb-6 text-[14px] text-muted-foreground border-b border-border">
          Two-factor authentication protects your account by requiring an additional code when you log in on an unrecognized device.
        </p>
        <h2 className="px-6 py-4 text-[16px] font-medium text-foreground">Choose your security method</h2>
        <div className="flex w-full items-start justify-between px-6 py-4 border-b border-border">
          <div className="flex flex-col gap-1 pr-6">
            <span className="text-[16px] text-foreground">Authentication app (recommended)</span>
            <span className="text-[13px] text-muted-foreground mt-1">Uses Google Authenticator or Duo Mobile.</span>
          </div>
          <Toggle checked={twoFactorApp} onChange={() => setTwoFactorApp(!twoFactorApp)} />
        </div>
        <div className="flex w-full items-start justify-between px-6 py-4 border-b border-border opacity-50">
          <div className="flex flex-col gap-1 pr-6">
            <span className="text-[16px] text-foreground">Text message (SMS)</span>
            <span className="text-[13px] text-muted-foreground mt-1">Currently unavailable.</span>
          </div>
          <Toggle checked={false} onChange={() => {}} disabled />
        </div>
      </div>
    </PageShell>
  );

  if (view === "security-login-activity") return (
    <PageShell>
      <SubPageHeader title="Login activity" onBack={() => { setView("security"); setActiveSessionMenu(null); }} />
      <div className="flex flex-col py-2">
        <h2 className="px-6 py-4 text-[16px] font-medium text-foreground">Where you&apos;re logged in</h2>
        {[
          { icon: <Smartphone size={22} />, name: "iPhone 14 Pro", location: "San Francisco, CA", time: "Active now", active: true },
          { icon: <Monitor size={22} />, name: "Mac OS", location: "San Jose, CA", time: "Yesterday", active: false },
        ].map((d) => (
          <div key={d.name} className="relative flex items-center gap-4 px-6 py-4 border-b border-border">
            <span className={d.active ? "text-foreground" : "text-muted-foreground"}>{d.icon}</span>
            <div className="flex flex-col flex-1">
              <span className="text-[15px] text-foreground">{d.location} · {d.name}</span>
              <span className={cn("text-[13px] mt-0.5", d.active ? "text-primary" : "text-muted-foreground")}>
                {d.time}
              </span>
            </div>
            <button
              onClick={() => setActiveSessionMenu(activeSessionMenu === d.name ? null : d.name)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <MoreHorizontal size={20} />
            </button>

            {/* Dropdown menu */}
            {activeSessionMenu === d.name && (
              <>
                {/* Transparent overlay to catch outside clicks */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setActiveSessionMenu(null)}
                />
                {/* Menu */}
                <div className="absolute right-6 top-12 z-20 min-w-[200px] rounded-2xl border border-border bg-background shadow-xl overflow-hidden">
                  {!d.active && (
                    <button
                      onClick={() => { toast("Flagged as unrecognized — we'll investigate"); setActiveSessionMenu(null); }}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-[14px] text-amber-500 hover:bg-foreground/5 transition-colors text-left"
                    >
                      <AlertTriangle size={16} />
                      This wasn&apos;t me
                    </button>
                  )}
                  <button
                    onClick={() => { toast(d.active ? "Logging out of this device…" : `Logged out of ${d.name}`); setActiveSessionMenu(null); }}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-[14px] text-destructive hover:bg-destructive/5 transition-colors text-left border-t border-border first:border-t-0"
                  >
                    <LogOut size={16} />
                    {d.active ? "Log out on this device" : "Log out of this device"}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </PageShell>
  );

  if (view === "security-saved-login") return (
    <PageShell>
      <SubPageHeader title="Saved login info" onBack={() => setView("security")} />
      <div className="flex flex-col py-2">
        <div className="flex w-full items-center justify-between px-6 py-4 border-b border-border">
          <span className="text-[16px] text-foreground">Saved login info</span>
          <Toggle checked={saveLogin} onChange={() => setSaveLogin(!saveLogin)} />
        </div>
        <p className="px-6 py-4 text-[13px] text-muted-foreground">
          We&apos;ll remember your account info on this device so you don&apos;t need to enter it again.
        </p>
      </div>
    </PageShell>
  );

  if (view === "notifications") return (
    <PageShell>
      <SubPageHeader title="Notifications" onBack={() => setView("main")} />
      <div className="flex flex-col py-2">
        <div className="flex w-full items-center justify-between px-6 py-4 border-b border-border mb-2">
          <span className="text-[16px] text-foreground">Pause all</span>
          <Toggle checked={pauseNotifs} onChange={() => setPauseNotifs(!pauseNotifs)} />
        </div>
        <SettingItem label="Threads and replies" onClick={() => setView("notifications-threads")} />
        <SettingItem label="Following and followers" onClick={() => setView("notifications-following")} />
        <SettingItem label="Messages" onClick={() => setView("notifications-messages")} />
        <SettingItem label="From Threads" onClick={() => setView("notifications-system")} />
      </div>
    </PageShell>
  );

  if (view === "notifications-threads") return (
    <PageShell>
      <SubPageHeader title="Threads and replies" onBack={() => setView("notifications")} />
      <div className="flex flex-col py-2">
        {["Likes", "Replies", "Mentions", "Reposts", "Quotes"].map((label) => (
          <SettingItem key={label} label={label} value="From everyone" />
        ))}
      </div>
    </PageShell>
  );

  if (view === "notifications-following") return (
    <PageShell>
      <SubPageHeader title="Following and followers" onBack={() => setView("notifications")} />
      <div className="flex flex-col py-2">
        {["New followers", "Accepted follow requests", "Account suggestions", "Mentions in bio"].map((label) => (
          <SettingItem key={label} label={label} value="On" />
        ))}
      </div>
    </PageShell>
  );

  if (view === "notifications-messages") return (
    <PageShell>
      <SubPageHeader title="Messages" onBack={() => setView("notifications")} />
      <div className="flex flex-col py-2">
        {["Message requests", "Messages", "Group requests"].map((label) => (
          <SettingItem key={label} label={label} value="On" />
        ))}
      </div>
    </PageShell>
  );

  if (view === "notifications-system") return (
    <PageShell>
      <SubPageHeader title="From Threads" onBack={() => setView("notifications")} />
      <div className="flex flex-col py-2">
        {["Reminders", "Product announcements", "Support requests"].map((label) => (
          <SettingItem key={label} label={label} value="On" />
        ))}
      </div>
    </PageShell>
  );

  if (view === "privacy") return (
    <PageShell>
      <SubPageHeader title="Privacy" onBack={() => setView("main")}
        action={
          <button onClick={savePrivacy} className="text-[15px] font-medium text-primary hover:opacity-80">
            Save
          </button>
        }
      />
      <div className="flex flex-col py-2">
        <div className="flex w-full items-center justify-between px-6 py-4 border-b border-border mb-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[16px] text-foreground">Private profile</span>
            <span className="text-[13px] text-muted-foreground">Only approved followers see your threads</span>
          </div>
          <Toggle checked={isPrivate} onChange={() => setIsPrivate(!isPrivate)} />
        </div>
        <SettingItem icon={<AtSign size={22} />} label="Mentions" value="Everyone" onClick={() => setView("privacy-mentions")} />
        <SettingItem icon={<MicOff size={22} />} label="Muted accounts" onClick={() => setView("privacy-muted")} />
        <SettingItem icon={<EyeOff size={22} />} label="Hidden words" onClick={() => setView("privacy-hidden")} />
        <SettingItem icon={<Ban size={22} />} label="Blocked profiles" onClick={() => setView("privacy-blocked")} />
      </div>
    </PageShell>
  );

  if (view === "privacy-mentions") return (
    <PageShell>
      <SubPageHeader title="Mentions" onBack={() => setView("privacy")} />
      <div className="flex flex-col py-4">
        <p className="px-6 pb-6 text-[14px] text-muted-foreground border-b border-border">
          Choose who can @mention you to link your profile.
        </p>
        {["Everyone", "Profiles you follow", "No one"].map((opt, i) => (
          <button key={opt}
            className="flex w-full items-center justify-between px-6 py-4 hover:bg-foreground/5 transition-colors">
            <span className="text-[16px] text-foreground">{opt}</span>
            {i === 0 && <Check size={18} className="text-primary" />}
          </button>
        ))}
      </div>
    </PageShell>
  );

  if (view === "privacy-muted") return (
    <PageShell>
      <SubPageHeader title="Muted accounts" onBack={() => setView("privacy")} />
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <MicOff size={48} className="text-muted-foreground mb-4" />
        <h2 className="text-[18px] mb-2 text-foreground">Muted accounts</h2>
        <p className="text-[14px] text-muted-foreground">
          Accounts you mute won&apos;t know you muted them. You won&apos;t see their threads or replies.
        </p>
      </div>
    </PageShell>
  );

  if (view === "privacy-hidden") return (
    <PageShell>
      <SubPageHeader title="Hidden words" onBack={() => setView("privacy")} />
      <div className="flex flex-col px-6 py-6 gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-[16px] font-medium text-foreground">Custom words &amp; phrases</h2>
          <p className="text-[14px] text-muted-foreground">
            Threads containing these words won&apos;t appear in your feed or replies.
          </p>
          {/* Word chips */}
          <div className="flex flex-wrap gap-2 mt-2">
            {hiddenWords.map((word) => (
              <div key={word}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-foreground rounded-full text-[13px] border border-border">
                <span>{word}</span>
                <button onClick={() => removeHiddenWord(word)} className="text-muted-foreground hover:text-red-500 transition-colors">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          {/* Add word input */}
          <div className="flex gap-2 mt-1">
            <input
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHiddenWord(); } }}
              placeholder="Add a word or phrase…"
              maxLength={50}
              className="flex-1 px-4 py-2.5 rounded-xl bg-secondary border border-border text-[14px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={addHiddenWord}
              disabled={!newWord.trim() || addingWord}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-[14px] font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center gap-1.5"
            >
              <Plus size={16} /> Add
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );

  if (view === "privacy-blocked") return (
    <PageShell>
      <SubPageHeader title="Blocked profiles" onBack={() => setView("privacy")} />
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <Ban size={48} className="text-muted-foreground mb-4" />
        <h2 className="text-[18px] mb-2 text-foreground">Blocked accounts</h2>
        <p className="text-[14px] text-muted-foreground">
          Blocked accounts can&apos;t find your profile or see your threads.
        </p>
      </div>
    </PageShell>
  );

  if (view === "help") return (
    <PageShell>
      <SubPageHeader title="Help" onBack={() => setView("main")} />
      <div className="flex flex-col py-2">
        <SettingItem icon={<AlertTriangle size={22} />} label="Report a problem" onClick={() => setView("help-report")} />
        <SettingItem icon={<FileQuestion size={22} />} label="Help Center" onClick={() => setView("help-center")} />
        <SettingItem icon={<ShieldAlert size={22} />} label="Privacy and security help" onClick={() => setView("help-security")} />
        <SettingItem icon={<FileText size={22} />} label="Support requests" onClick={() => setView("help-support")} />
      </div>
    </PageShell>
  );

  if (view === "help-report") return (
    <PageShell>
      <SubPageHeader title="Report a problem" onBack={() => setView("help")} />
      <div className="flex flex-col px-6 py-6 gap-4">
        <p className="text-[14px] text-muted-foreground">Briefly explain what happened or what&apos;s not working.</p>
        <textarea rows={6} placeholder="Please include as much detail as possible…"
          className="w-full resize-none px-4 py-3 rounded-xl bg-secondary border border-border text-[15px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
        />
        <button onClick={() => toast("Report submitted — thank you!")} className={btnPrimary()}>
          Send report
        </button>
      </div>
    </PageShell>
  );

  if (view === "help-center") return (
    <PageShell>
      <SubPageHeader title="Help Center" onBack={() => setView("help")} />
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <FileQuestion size={48} className="text-muted-foreground mb-4" />
        <h2 className="text-[18px] mb-2 text-foreground">How can we help?</h2>
        <p className="text-[14px] text-muted-foreground mb-6">Find answers to common questions about using Threads.</p>
        <button onClick={() => toast("Opening Help Center…")}
          className="px-6 py-2.5 rounded-xl border border-border text-foreground text-[14px] font-medium hover:bg-secondary transition-colors">
          Visit Help Center
        </button>
      </div>
    </PageShell>
  );

  if (view === "help-security") return (
    <PageShell>
      <SubPageHeader title="Privacy & security help" onBack={() => setView("help")} />
      <div className="flex flex-col py-2">
        {["Managing your account", "Staying safe on Threads", "Security tips"].map((l) => (
          <SettingItem key={l} label={l} />
        ))}
      </div>
    </PageShell>
  );

  if (view === "help-support") return (
    <PageShell>
      <SubPageHeader title="Support requests" onBack={() => setView("help")} />
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <FileText size={48} className="text-muted-foreground mb-4" />
        <h2 className="text-[18px] mb-2 text-foreground">No open requests</h2>
        <p className="text-[14px] text-muted-foreground">You don&apos;t have any support requests right now.</p>
      </div>
    </PageShell>
  );

  if (view === "about") return (
    <PageShell>
      <SubPageHeader title="About" onBack={() => setView("main")} />
      <div className="flex flex-col py-2">
        <SettingItem icon={<Info size={22} />} label="Privacy Policy" onClick={() => setView("about-privacy")} />
        <SettingItem icon={<FileText size={22} />} label="Terms of Use" onClick={() => setView("about-terms")} />
        <SettingItem icon={<FileText size={22} />} label="Open source libraries" onClick={() => setView("about-libraries")} />
      </div>
    </PageShell>
  );

  if (view === "about-privacy") return (
    <PageShell>
      <SubPageHeader title="Privacy Policy" onBack={() => setView("about")} />
      <div className="px-6 py-6 text-[14px] text-muted-foreground leading-relaxed space-y-4">
        <p><strong className="text-foreground">Last updated: June 2026</strong></p>
        <p>Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your personal information when you use Threads.</p>
        <p>We only collect data necessary to provide and improve our services. Your data is encrypted and securely stored. We do not sell your personal information to third parties.</p>
      </div>
    </PageShell>
  );

  if (view === "about-terms") return (
    <PageShell>
      <SubPageHeader title="Terms of Use" onBack={() => setView("about")} />
      <div className="px-6 py-6 text-[14px] text-muted-foreground leading-relaxed space-y-4">
        <p>By accessing or using Threads, you agree to be bound by these Terms of Use.</p>
        <p>You are responsible for your use of the service and for any content you provide, including compliance with applicable laws, rules, and regulations.</p>
      </div>
    </PageShell>
  );

  if (view === "about-libraries") return (
    <PageShell>
      <SubPageHeader title="Open source libraries" onBack={() => setView("about")} />
      <div className="flex flex-col py-2">
        {[
          ["Next.js", "v15"],
          ["React", "v19"],
          ["NestJS", "v11"],
          ["Tailwind CSS", "v4"],
          ["Lucide React", "latest"],
          ["Framer Motion", "v12"],
          ["Zustand", "v5"],
        ].map(([name, ver]) => (
          <SettingItem key={name} label={name} value={ver} hideChevron />
        ))}
      </div>
    </PageShell>
  );

  // ── Main view ──────────────────────────────────────────────────────────────

  return (
    <PageShell>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center border-b border-border bg-background/90 backdrop-blur-xl px-4 py-4">
        <button onClick={() => router.back()} className="mr-4 text-foreground hover:text-muted-foreground transition-colors">
          <ChevronRight size={22} className="rotate-180" />
        </button>
        <h1 className="text-[18px] text-foreground">Settings</h1>
      </div>

      <div className="flex flex-col py-2">
        <SectionLabel>Account</SectionLabel>
        <SettingItem icon={<User size={22} />} label="Personal information" onClick={() => setView("personal-info")} />
        <SettingItem icon={<Shield size={22} />} label="Security" onClick={() => setView("security")} />
        <SettingItem icon={<Palette size={22} />} label="Appearance" value={theme.charAt(0).toUpperCase() + theme.slice(1)} onClick={() => setView("appearance")} />
        <SettingItem icon={<Languages size={22} />} label="Language" value={language} onClick={() => setView("language")} />

        <SectionLabel>Preferences</SectionLabel>
        <SettingItem icon={<Bell size={22} />} label="Notifications" onClick={() => setView("notifications")} />
        <SettingItem icon={<EyeOff size={22} />} label="Privacy" onClick={() => setView("privacy")} />

        <SectionLabel>Support</SectionLabel>
        <SettingItem icon={<HelpCircle size={22} />} label="Help Center" onClick={() => setView("help")} />
        <SettingItem icon={<Info size={22} />} label="About" onClick={() => setView("about")} />

        <div className="mt-4 border-t border-border">
          <SettingItem icon={<LogOut size={22} />} label="Log out" danger hideChevron onClick={logout} />
        </div>
      </div>

      <div className="mt-auto flex flex-col items-center gap-1 py-8">
        <span className="text-[12px] text-muted-foreground">Threads v1.0.0</span>
        <span className="text-[11px] text-muted-foreground/60">© 2026</span>
      </div>
    </PageShell>
  );
}

// ─── Layout wrapper ───────────────────────────────────────────────────────────
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full justify-center bg-background text-foreground transition-colors duration-200">
      <div className="hidden md:flex flex-col h-screen sticky top-0 border-r border-border w-[252px] flex-shrink-0">
        <DesktopSidebar />
      </div>
      <main className="w-full max-w-[622px] border-r border-border min-h-screen pb-14 md:pb-0">
        {children}
      </main>
      <div className="md:hidden"><MobileNav /></div>
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] uppercase tracking-wider text-muted-foreground ml-1">{label}</label>
      {children}
    </div>
  );
}
