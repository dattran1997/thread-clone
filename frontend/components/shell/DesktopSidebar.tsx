"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notifications";
import { Logo } from "./Logo";
import { Avatar } from "@/components/ui/Avatar";
import {
  HomeIcon, SearchIcon, BellIcon, MessageIcon, ComposeIcon, UserIcon, SettingsIcon,
} from "@/components/ui/Icons";

export function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
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
    <aside className="w-[252px] flex flex-col h-full px-3 py-5 gap-1">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 px-3 py-2 mb-4 text-[var(--text)]">
        <Logo size={28} />
      </Link>

      {/* Nav items */}
      {items.map(({ href, label, Icon, badge }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-[15px]",
              active
                ? "bg-[var(--bg2)] text-[var(--text)] font-semibold"
                : "text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)]",
            )}
          >
            <span className="relative">
              <Icon size={22} />
              {badge && badge > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 text-[9px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                  {badge > 99 ? "99+" : badge}
                </span>
              ) : null}
            </span>
            <span>{label}</span>
          </Link>
        );
      })}

      {/* New Thread CTA */}
      <button
        onClick={() => router.push("/compose")}
        className="mx-3 mt-4 px-4 py-3 rounded-xl bg-[var(--accent)] text-[var(--accent-text)] font-semibold text-[15px] hover:opacity-90 transition-opacity"
      >
        New thread
      </button>

      {/* User handle footer */}
      <div className="mt-auto">
        <Link href="/settings" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[var(--bg2)] transition-colors">
          <SettingsIcon size={18} className="text-[var(--text2)]" />
          <span className="text-sm text-[var(--text2)]">Settings</span>
        </Link>
        {user && (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text2)]">
            <Avatar src={user.avatarUrl} alt={user.displayName} size={24} />
            <span>@{user.username}</span>
          </div>
        )}
      </div>
    </aside>
  );
}
