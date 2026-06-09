"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notifications";
import { useComposeStore } from "@/stores/compose";
import { Home, Search, Bell, Mail, PlusCircle } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

export function MobileNav() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const unreadNotifications = useNotificationStore((s) => s.unreadCount);
  const unreadMessages = useNotificationStore((s) => s.unreadMessages);
  const openCompose = useComposeStore((s) => s.open);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around px-4 bg-[var(--bg-blur)] backdrop-blur-xl border-t border-[var(--border)]"
    >
      {/* Home */}
      <Link
        href="/"
        aria-label="Home"
        className={cn(
          "flex items-center justify-center w-12 h-12 transition-colors",
          isActive("/") ? "text-[var(--text)]" : "text-[var(--text2)]",
        )}
      >
        <Home size={26} />
      </Link>

      {/* Search */}
      <Link
        href="/search"
        aria-label="Search"
        className={cn(
          "flex items-center justify-center w-12 h-12 transition-colors",
          isActive("/search") ? "text-[var(--text)]" : "text-[var(--text2)]",
        )}
      >
        <Search size={26} />
      </Link>

      {/* Compose (center) */}
      <button
        onClick={() => openCompose()}
        aria-label="New thread"
        className="flex items-center justify-center w-12 h-12 text-[var(--text)] transition-colors"
      >
        <PlusCircle size={32} />
      </button>

      {/* Activity */}
      <Link
        href="/activity"
        aria-label="Activity"
        className={cn(
          "relative flex items-center justify-center w-12 h-12 transition-colors",
          isActive("/activity") ? "text-[var(--text)]" : "text-[var(--text2)]",
        )}
      >
        <Bell size={26} />
        {unreadNotifications > 0 && (
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
        )}
      </Link>

      {/* Profile */}
      <Link
        href={user ? `/${user.username}` : "/login"}
        aria-label="Profile"
        className={cn(
          "flex items-center justify-center w-12 h-12 transition-colors",
          isActive(user ? `/${user.username}` : "/login")
            ? "text-[var(--text)]"
            : "text-[var(--text2)]",
        )}
      >
        {user?.avatarUrl ? (
          <Avatar src={user.avatarUrl} alt={user.displayName} size={26} />
        ) : (
          <Avatar src={null} alt="Profile" size={26} />
        )}
      </Link>
    </nav>
  );
}
