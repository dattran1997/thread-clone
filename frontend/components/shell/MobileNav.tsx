"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notifications";
import {
  HomeIcon, SearchIcon, ComposeIcon, BellIcon, MessageIcon,
} from "@/components/ui/Icons";
import { Avatar } from "@/components/ui/Avatar";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export function MobileNav() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const unreadNotifications = useNotificationStore((s) => s.unreadCount);
  const unreadMessages = useNotificationStore((s) => s.unreadMessages);

  const items: NavItem[] = [
    { href: "/", label: "Home", icon: <HomeIcon size={24} /> },
    { href: "/search", label: "Search", icon: <SearchIcon size={24} /> },
    { href: "/compose", label: "Compose", icon: <ComposeIcon size={24} /> },
    { href: "/activity", label: "Activity", icon: <BellIcon size={24} />, badge: unreadNotifications },
    { href: "/messages", label: "Messages", icon: <MessageIcon size={24} />, badge: unreadMessages },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 pb-safe bg-[var(--bg-blur)] backdrop-blur-md border-t border-[var(--border)]"
      style={{ height: 60 }}>
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            className={cn(
              "relative flex items-center justify-center w-12 h-12 rounded-xl transition-colors",
              active ? "text-[var(--text)]" : "text-[var(--text2)]",
            )}
          >
            {item.icon}
            {item.badge && item.badge > 0 ? (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
      {/* Profile avatar */}
      <Link href={user ? `/${user.username}` : "/login"} aria-label="Profile">
        <Avatar src={user?.avatarUrl} alt={user?.displayName ?? "Profile"} size={28} />
      </Link>
    </nav>
  );
}
