"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notifications";
import { Avatar } from "@/components/ui/Avatar";
import { DesktopSidebar } from "@/components/shell/DesktopSidebar";
import { MobileNav } from "@/components/shell/MobileNav";
import { cn, relativeTime } from "@/lib/utils";
import { RightPanel } from "@/components/shell/RightPanel";
import { Heart, UserPlus, MessageCircle, Repeat2, AtSign } from "lucide-react";

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

const TYPE_CONFIG: Record<NotifType, { icon: React.ReactNode; label: string }> = {
  LIKE:    { icon: <Heart    size={12} fill="currentColor" />, label: "liked your thread" },
  FOLLOW:  { icon: <UserPlus size={12} />, label: "followed you" },
  REPLY:   { icon: <MessageCircle size={12} />, label: "replied to your thread" },
  REPOST:  { icon: <Repeat2  size={12} />, label: "reposted your thread" },
  QUOTE:   { icon: <MessageCircle size={12} />, label: "quoted your thread" },
  MENTION: { icon: <AtSign   size={12} />, label: "mentioned you" },
};

const TYPE_BADGE: Record<NotifType, string> = {
  LIKE:    "bg-[#ff3040] text-white",
  FOLLOW:  "bg-[#0095f6] text-white",
  REPLY:   "bg-purple-500 text-white",
  REPOST:  "bg-green-500 text-white",
  QUOTE:   "bg-yellow-500 text-white",
  MENTION: "bg-amber-500 text-white",
};

export default function ActivityPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const decrementUnread = useNotificationStore((s) => s.decrementUnread);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      api.get<{ data: Notification[] }>("/notifications"),
      api.get<{ count: number }>("/notifications/unread-count"),
    ]).then(([notifs, count]) => {
      setNotifications(notifs.data);
      setUnreadCount(count.count);
    }).finally(() => setLoading(false));
  }, [user, setUnreadCount]);

  // Called when user clicks a notification — marks it read immediately (visual),
  // then navigates. Using router.push instead of <Link> so the state re-renders
  // (dot disappears) before navigation happens.
  function handleNotifClick(n: Notification) {
    const href = n.entityType === "thread" ? `/threads/${n.entityId}` : `/${n.actor.username}`;

    if (!n.isRead) {
      api.patch(`/notifications/${n.id}/read`, {}).catch(() => {});
      setNotifications((prev) =>
        prev.map((notif) => notif.id === n.id ? { ...notif, isRead: true } : notif),
      );
      decrementUnread();
    }

    // Navigate after state update so user briefly sees the dot disappear
    router.push(href);
  }

  async function markAllRead() {
    await api.patch("/notifications/read-all", {});
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  const filtered = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "follows") return n.type === "FOLLOW";
    return n.type === "REPLY" || n.type === "MENTION";
  });

  if (!hasHydrated) {
    return <div className="flex min-h-screen bg-background" />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <p className="text-muted-foreground">Please log in to see notifications</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full justify-center bg-background text-foreground transition-colors duration-200">
      <div className="hidden md:flex flex-col h-screen sticky top-0 border-r border-border w-[252px] flex-shrink-0">
        <DesktopSidebar />
      </div>

      <main className="w-full max-w-[622px] border-r border-border min-h-screen pb-14 md:pb-0">
        {/* Header */}
        <div className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <h1 className="text-xl font-bold text-foreground">
              Activity
              {unreadCount > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">{unreadCount} new</span>
              )}
            </h1>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
                Mark all read
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex">
            {(["all", "mentions", "follows"] as FilterTab[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "relative flex-1 py-4 text-[15px] font-medium capitalize transition-colors",
                  filter === f ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f}
                {filter === f && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-4 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-muted-foreground">No notifications yet</div>
        ) : (
          <div>
            {filtered.map((n) => {
              const cfg = TYPE_CONFIG[n.type];
              const badgeClass = TYPE_BADGE[n.type];
              return (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleNotifClick(n)}
                  onKeyDown={(e) => e.key === "Enter" && handleNotifClick(n)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-4 border-b border-border transition-colors hover:bg-foreground/5 cursor-pointer",
                    !n.isRead && "bg-foreground/5 border-l-2 border-l-primary",
                  )}
                >
                  {/* Avatar + icon badge */}
                  <div className="relative flex-shrink-0">
                    <Avatar src={n.actor.avatarUrl} alt={n.actor.displayName} size={36} />
                    <span className={cn(
                      "absolute -bottom-1 -right-1 flex h-[20px] w-[20px] items-center justify-center rounded-full border-2 border-background",
                      badgeClass,
                    )}>
                      {cfg.icon}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">@{n.actor.username}</span>{" "}
                      {cfg.label}
                    </p>
                    {n.preview && <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.preview}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">{relativeTime(n.createdAt)}</p>
                  </div>

                  {/* Unread dot — disappears instantly on click because state updates before navigation */}
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <div className="hidden lg:flex w-[310px] flex-shrink-0"><RightPanel /></div>
      <div className="md:hidden"><MobileNav /></div>
    </div>
  );
}
