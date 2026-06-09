"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notifications";
import { useComposeStore } from "@/stores/compose";
import { Logo } from "./Logo";
import { Avatar } from "@/components/ui/Avatar";
import {
  HomeIcon, SearchIcon, BellIcon, MessageIcon, UserIcon,
} from "@/components/ui/Icons";

export function DesktopSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const openCompose = useComposeStore((s) => s.open);
  const unreadNotifications = useNotificationStore((s) => s.unreadCount);
  const unreadMessages = useNotificationStore((s) => s.unreadMessages);

  const items = [
    { href: "/", label: "Home", Icon: HomeIcon },
    { href: "/search", label: "Search", Icon: SearchIcon },
    { href: "/activity", label: "Activity", Icon: BellIcon, badge: unreadNotifications },
    { href: "/messages", label: "Messages", Icon: MessageIcon, badge: unreadMessages },
    { href: user ? `/${user.username}` : "/login", label: "Profile", Icon: UserIcon },
  ];

  return (
    <aside className="w-[252px] flex flex-col h-full px-4 py-6">
      {/* Logo */}
      <div className="mb-8 px-2">
        <Link href="/">
          <Logo size={32} />
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1">
        {items.map(({ href, label, Icon, badge }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex w-full items-center gap-4 rounded-xl px-4 py-3 transition-colors text-[16px]",
                active
                  ? "bg-[var(--bg2)] text-[var(--text)]"
                  : "text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)]",
              )}
            >
              <span className="relative flex-shrink-0">
                <Icon size={24} />
                {badge !== undefined && badge > 0 ? (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center border-2 border-[var(--bg)]">
                    {badge > 99 ? "99+" : badge}
                  </span>
                ) : null}
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
          className="w-full py-4 px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-text)] font-semibold text-[15px] hover:opacity-90 transition-opacity"
        >
          New thread
        </button>
      </div>

      {/* User handle footer */}
      <div className="mt-auto flex items-center gap-3 px-2 py-2">
        {user ? (
          <>
            <Avatar src={user.avatarUrl} alt={user.displayName} size={32} />
            <Link href={`/${user.username}`} className="text-[14px] text-[var(--text2)] hover:text-[var(--text)] transition-colors">
              @{user.username}
            </Link>
          </>
        ) : (
          <Link href="/login" className="text-[14px] text-[var(--text2)] hover:text-[var(--text)] transition-colors">
            Sign in
          </Link>
        )}
      </div>
    </aside>
  );
}
