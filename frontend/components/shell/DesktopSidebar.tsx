"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notifications";
import { useComposeStore } from "@/stores/compose";
import { Logo } from "./Logo";
import { Avatar } from "@/components/ui/Avatar";
import { Home, Search, Bell, Mail, User, Bookmark, Settings } from "lucide-react";

export function DesktopSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const openCompose = useComposeStore((s) => s.open);
  const unreadNotifications = useNotificationStore((s) => s.unreadCount);
  const unreadMessages = useNotificationStore((s) => s.unreadMessages);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const navItems = [
    { href: "/",         label: "Home",     Icon: Home  },
    { href: "/search",   label: "Search",   Icon: Search },
    { href: "/activity", label: "Activity", Icon: Bell,
      badge: unreadNotifications, badgeColor: "red" as const },
    { href: "/messages", label: "Messages", Icon: Mail,
      badge: unreadMessages, badgeColor: "blue" as const },
    { href: user ? `/${user.username}` : "/login", label: "Profile", Icon: User },
    { href: "/saved",    label: "Saved",    Icon: Bookmark },
    { href: "/settings", label: "Settings", Icon: Settings },
  ];

  return (
    <aside className="w-[252px] flex flex-col h-full px-4 py-6">
      {/* Logo */}
      <div className="mb-8 px-4">
        <Link href="/">
          <Logo size={32} />
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1">
        {navItems.map(({ href, label, Icon, badge, badgeColor }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex w-full items-center gap-4 rounded-xl px-4 py-3 transition-colors text-[16px]",
                active
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <span className="relative flex-shrink-0">
                <Icon size={24} />
                {badge !== undefined && badge > 0 && (
                  <span
                    className={cn(
                      "absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 text-[10px] font-bold text-white rounded-full flex items-center justify-center border-2 border-background",
                      badgeColor === "blue" ? "bg-[#0095f6]" : "bg-[#ff3040]",
                    )}
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* New Thread CTA */}
      <div className="mt-8">
        <button
          onClick={() => openCompose()}
          className="w-full py-4 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-[15px] hover:opacity-90 transition-opacity border border-transparent"
        >
          New thread
        </button>
      </div>

      {/* User handle footer */}
      <div className="mt-auto flex items-center gap-3 px-4 py-2">
        {user ? (
          <>
            <Avatar src={user.avatarUrl} alt={user.displayName} size={32} />
            <Link
              href={`/${user.username}`}
              className="text-[14px] text-muted-foreground hover:text-foreground transition-colors"
            >
              @{user.username}
            </Link>
          </>
        ) : (
          <Link
            href="/login"
            className="text-[14px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
        )}
      </div>
    </aside>
  );
}
