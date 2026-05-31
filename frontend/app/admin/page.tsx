"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import { useAuthStore } from "@/stores/auth";
import { DesktopSidebar } from "@/components/shell/DesktopSidebar";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Stats { userCount: number; threadCount: number; reportCount: number; }
interface User { id: string; username: string; displayName: string; avatarUrl: string | null; isActive: boolean; role: string; createdAt: string; }
interface Report { id: string; reporter: { username: string }; targetType: string; targetId: string; reason: string; status: string; createdAt: string; }
type AdminTab = "stats" | "users" | "reports";

export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<AdminTab>("stats");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "ADMIN") { toast("Access denied", "error"); router.push("/"); return; }
    loadData();
  }, [user, router]);

  async function loadData() {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([
        api.get<Stats>("/admin/stats"),
        api.get<{ data: Report[] }>("/admin/reports"),
      ]);
      setStats(s);
      setReports(r.data);
    } finally { setLoading(false); }
  }

  async function searchUsers() {
    if (!search.trim()) return;
    const res = await api.get<{ data: User[] }>(`/admin/users?q=${encodeURIComponent(search)}`);
    setUsers(res.data);
    setTab("users");
  }

  async function toggleSuspend(u: User) {
    try {
      if (u.isActive) {
        await api.patch(`/admin/users/${u.id}/suspend`, {});
        toast(`@${u.username} suspended`);
      } else {
        await api.patch(`/admin/users/${u.id}/unsuspend`, {});
        toast(`@${u.username} reinstated`);
      }
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, isActive: !u.isActive } : x));
    } catch { toast("Action failed", "error"); }
  }

  async function resolveReport(report: Report, status: "RESOLVED" | "DISMISSED") {
    try {
      await api.patch(`/admin/reports/${report.id}`, { status });
      setReports((prev) => prev.map((r) => r.id === report.id ? { ...r, status } : r));
      toast(`Report ${status.toLowerCase()}`);
    } catch { toast("Action failed", "error"); }
  }

  if (!user || user.role !== "ADMIN") return null;

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex flex-col h-screen sticky top-0 border-r border-[var(--border)]">
        <DesktopSidebar />
      </div>

      <main className="flex-1 max-w-[800px] mx-auto border-r border-[var(--border)] min-h-screen">
        <div className="sticky top-0 z-20 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-blur)] backdrop-blur-md">
          <h1 className="text-xl font-bold text-[var(--text)]">Admin Panel</h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)]">
          {(["stats", "users", "reports"] as AdminTab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-3 text-sm font-medium capitalize border-b-2 transition-colors",
                tab === t
                  ? "border-[var(--accent)] text-[var(--text)]"
                  : "border-transparent text-[var(--text2)] hover:text-[var(--text)]",
              )}>
              {t}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === "stats" && stats && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total users", value: stats.userCount },
                { label: "Total threads", value: stats.threadCount },
                { label: "Pending reports", value: stats.reportCount },
              ].map((s) => (
                <div key={s.label} className="p-4 rounded-xl bg-[var(--bg2)] text-center">
                  <p className="text-3xl font-bold text-[var(--text)]">{s.value.toLocaleString()}</p>
                  <p className="text-xs text-[var(--text2)] mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {tab === "users" && (
            <>
              <div className="flex gap-2 mb-4">
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                  placeholder="Search users by name or handle…"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg2)] text-sm text-[var(--text)] placeholder:text-[var(--text2)] outline-none border border-[var(--border)]" />
                <button onClick={searchUsers}
                  className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-text)] text-sm font-semibold">
                  Search
                </button>
              </div>
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 py-3 border-b border-[var(--border)]">
                  <Avatar src={u.avatarUrl} alt={u.displayName} size={36} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text)]">{u.displayName}</p>
                    <p className="text-xs text-[var(--text2)]">@{u.username} · {u.role}</p>
                  </div>
                  <button onClick={() => toggleSuspend(u)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold",
                      u.isActive
                        ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                        : "bg-green-500/10 text-green-500 hover:bg-green-500/20",
                    )}>
                    {u.isActive ? "Suspend" : "Reinstate"}
                  </button>
                </div>
              ))}
            </>
          )}

          {tab === "reports" && (
            <div className="space-y-3">
              {reports.filter((r) => r.status === "PENDING").length === 0 && (
                <p className="text-center text-[var(--text2)] text-sm py-8">No pending reports 🎉</p>
              )}
              {reports.filter((r) => r.status === "PENDING").map((r) => (
                <div key={r.id} className="p-4 rounded-xl bg-[var(--bg2)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text2)]">
                      {r.targetType} report
                    </span>
                    <span className="text-xs text-[var(--text3)]">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-[var(--text)]"><strong>Reason:</strong> {r.reason}</p>
                  <p className="text-xs text-[var(--text2)]">Reported by @{r.reporter.username}</p>
                  <div className="flex gap-2">
                    <button onClick={() => resolveReport(r, "RESOLVED")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-500 hover:bg-red-500/20">
                      Remove content
                    </button>
                    <button onClick={() => resolveReport(r, "DISMISSED")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg3)] text-[var(--text2)] hover:bg-[var(--border)]">
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
