"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notifications";
import { useComposeStore } from "@/stores/compose";
import { Home, Search, PlusCircle, Bell, User } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

export function MobileNav() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const unreadNotifications = useNotificationStore((s) => s.unreadCount);
  const openCompose = useComposeStore((s) => s.open);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-[56px] items-center justify-around border-t border-border bg-background/90 px-4 backdrop-blur-xl">
      {/* Home */}
      <Link href="/" aria-label="Home"
        className={cn("flex items-center justify-center w-12 h-12 transition-colors",
          isActive("/") ? "text-foreground" : "text-muted-foreground")}>
        <Home size={26} />
      </Link>

      {/* Search */}
      <Link href="/search" aria-label="Search"
        className={cn("flex items-center justify-center w-12 h-12 transition-colors",
          isActive("/search") ? "text-foreground" : "text-muted-foreground")}>
        <Search size={26} />
      </Link>

      {/* Compose — center button, always foreground */}
      <button
        onClick={() => openCompose()}
        aria-label="New thread"
        className="flex items-center justify-center w-12 h-12 text-foreground hover:text-muted-foreground transition-colors"
      >
        <PlusCircle size={32} />
      </button>

      {/* Activity — red dot for unread */}
      <Link href="/activity" aria-label="Activity"
        className={cn("relative flex items-center justify-center w-12 h-12 transition-colors",
          isActive("/activity") ? "text-foreground" : "text-muted-foreground")}>
        <Bell size={26} />
        {unreadNotifications > 0 && (
          <span className="absolute top-2.5 right-2 h-2 w-2 rounded-full bg-[#ff3040] border-2 border-background" />
        )}
      </Link>

      {/* Profile — avatar when logged in, user icon when not */}
      <Link
        href={user ? `/${user.username}` : "/login"}
        aria-label="Profile"
        className={cn(
          "flex items-center justify-center w-12 h-12 transition-opacity",
          isActive(user ? `/${user.username}` : "/login") ? "opacity-100" : "opacity-50",
        )}
      >
        {user
          ? <Avatar src={user.avatarUrl} alt={user.displayName} size={28} />
          : <User size={26} />
        }
      </Link>
    </nav>
  );
}
