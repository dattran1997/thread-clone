"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notifications";
import { Avatar } from "@/components/ui/Avatar";
import { DesktopSidebar } from "@/components/shell/DesktopSidebar";
import { MobileNav } from "@/components/shell/MobileNav";
import { cn, relativeTime } from "@/lib/utils";
import Link from "next/link";

type NotifType = "LIKE" | "FOLLOW" | "REPLY" | "REPOST" | "QUOTE" | "MENTION";
type FilterTab = "all" | "mentions" | "follows";

interface Notification {
  id: string;
  type: NotifType;
  actor: { id: string; username: string; displayName: string; avatarUrl: string | null };
  entityId: string;
  entityType: "thread" | "user";
  preview: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_CONFIG: Record<NotifType, { icon: string; color: string; label: string }> = {
  LIKE:    { icon: "♥", color: "text-red-500",    label: "liked your thread" },
  FOLLOW:  { icon: "＋", color: "text-blue-500",   label: "followed you" },
  REPLY:   { icon: "↩", color: "text-purple-500",  label: "replied to your thread" },
  REPOST:  { icon: "↻", color: "text-green-500",   label: "reposted your thread" },
  QUOTE:   { icon: "❝", color: "text-yellow-500",  label: "quoted your thread" },
  MENTION: { icon: "@", color: "text-amber-500",   label: "mentioned you" },
};

export default function ActivityPage() {
  const user = useAuthStore((s) => s.user);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [loading, setLoading] = useState(true);
  const [unreadCount, setLocalUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      api.get<{ data: Notification[] }>("/notifications"),
      api.get<{ count: number }>("/notifications/unread-count"),
    ]).then(([notifs, count]) => {
      setNotifications(notifs.data);
      setLocalUnread(count.count);
    }).finally(() => setLoading(false));
  }, [user]);

  async function markAllRead() {
    await api.patch("/notifications/read-all", {});
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setLocalUnread(0);
    setUnreadCount(0);
  }

  const filtered = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "follows") return n.type === "FOLLOW";
    return n.type === "REPLY" || n.type === "MENTION";
  });

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--text2)]">Please log in to see notifications</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex flex-col h-screen sticky top-0 border-r border-[var(--border)]">
        <DesktopSidebar />
      </div>

      <main className="flex-1 max-w-[622px] mx-auto border-r border-[var(--border)] min-h-screen pb-20 lg:pb-0">
        {/* Header */}
        <div className="sticky top-0 z-20 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-blur)] backdrop-blur-md">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-xl font-bold text-[var(--text)]">
              Activity {unreadCount > 0 && <span className="text-[var(--text2)] font-normal text-base">({unreadCount} new)</span>}
            </h1>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-sm text-[var(--accent)] hover:underline">
                Mark all read
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mt-2">
            {(["all", "mentions", "follows"] as FilterTab[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors",
                  filter === f
                    ? "bg-[var(--accent)] text-[var(--accent-text)]"
                    : "bg-[var(--bg2)] text-[var(--text2)] hover:bg-[var(--bg3)]",
                )}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-4 text-center text-[var(--text2)]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-[var(--text2)]">No notifications yet</div>
        ) : (
          <div>
            {filtered.map((n) => {
              const cfg = TYPE_CONFIG[n.type];
              const href = n.entityType === "thread" ? `/threads/${n.entityId}` : `/${n.actor.username}`;
              return (
                <Link key={n.id} href={href}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 border-b border-[var(--border)] transition-colors hover:bg-[var(--bg2)]/50",
                    !n.isRead && "bg-blue-500/5 border-l-2 border-l-blue-500",
                  )}>
                  <div className="relative flex-shrink-0">
                    <Avatar src={n.actor.avatarUrl} alt={n.actor.displayName} size={36} />
                    <span className={cn("absolute -bottom-1 -right-1 text-xs w-5 h-5 rounded-full bg-[var(--bg2)] flex items-center justify-center border border-[var(--border)]", cfg.color)}>
                      {cfg.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text)]">
                      <span className="font-semibold">@{n.actor.username}</span>{" "}
                      {cfg.label}
                    </p>
                    {n.preview && <p className="text-xs text-[var(--text2)] mt-0.5 truncate">{n.preview}</p>}
                    <p className="text-xs text-[var(--text3)] mt-0.5">{relativeTime(n.createdAt)}</p>
                  </div>
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />}
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <div className="lg:hidden"><MobileNav /></div>
    </div>
  );
}
