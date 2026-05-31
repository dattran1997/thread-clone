"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { PostCard, Thread } from "@/components/thread/PostCard";
import { DesktopSidebar } from "@/components/shell/DesktopSidebar";
import { MobileNav } from "@/components/shell/MobileNav";
import { BackIcon, CloseIcon, SearchIcon } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface UserResult {
  id: string; username: string; displayName: string;
  avatarUrl: string | null; isVerified: boolean; followerCount?: number;
}

const TRENDING = [
  { rank: 1, topic: "#design", count: "12.4K" },
  { rank: 2, topic: "#typescript", count: "8.1K" },
  { rank: 3, topic: "#nextjs", count: "6.9K" },
  { rank: 4, topic: "#threads", count: "5.2K" },
  { rank: 5, topic: "#opensource", count: "4.7K" },
  { rank: 6, topic: "#ai", count: "3.8K" },
  { rank: 7, topic: "#webdev", count: "3.1K" },
];

export default function SearchPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [type, setType] = useState<"users" | "threads" | "tags">("users");
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [threadResults, setThreadResults] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim()) { setUserResults([]); setThreadResults([]); return; }
    debounceRef.current && clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get<{ data: any[] }>(`/search?q=${encodeURIComponent(query)}&type=${type}`);
        if (type === "users") setUserResults(res.data as UserResult[]);
        else setThreadResults(res.data as Thread[]);
      } catch {} finally { setLoading(false); }
    }, 300);
  }, [query, type]);

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex flex-col h-screen sticky top-0 border-r border-[var(--border)]">
        <DesktopSidebar />
      </div>

      <main className="flex-1 max-w-[622px] mx-auto border-r border-[var(--border)] min-h-screen pb-20 lg:pb-0">
        {/* Search bar */}
        <div className="sticky top-0 z-20 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-blur)] backdrop-blur-md">
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="p-1 text-[var(--text2)] lg:hidden">
              <BackIcon size={20} />
            </button>
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg2)]">
              <SearchIcon size={16} className="text-[var(--text2)] flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text2)] outline-none"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-[var(--text2)]">
                  <CloseIcon size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Type toggle */}
          {query && (
            <div className="flex gap-2 mt-2">
              {(["users", "threads", "tags"] as const).map((t) => (
                <button key={t} onClick={() => setType(t)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors",
                    type === t
                      ? "bg-[var(--accent)] text-[var(--accent-text)]"
                      : "bg-[var(--bg2)] text-[var(--text2)] hover:bg-[var(--bg3)]",
                  )}>
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        {!query ? (
          /* Trending page */
          <div className="p-4">
            <h2 className="font-semibold text-[var(--text)] mb-4">Trending</h2>
            <div className="space-y-4">
              {TRENDING.map((t) => (
                <button key={t.rank} onClick={() => setQuery(t.topic)}
                  className="w-full flex items-center justify-between hover:bg-[var(--bg2)] px-2 py-2 rounded-xl transition-colors">
                  <div className="text-left">
                    <p className="text-xs text-[var(--text2)]">{t.rank} · Trending</p>
                    <p className="font-semibold text-[var(--text)]">{t.topic}</p>
                    <p className="text-xs text-[var(--text2)]">{t.count} threads</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : loading ? (
          <div className="p-6 text-center text-[var(--text2)] text-sm">Searching…</div>
        ) : type === "users" && userResults.length === 0 ? (
          <div className="p-6 text-center text-[var(--text2)] text-sm">No results for "{query}"</div>
        ) : type === "users" ? (
          <div>
            {userResults.map((u) => (
              <Link key={u.id} href={`/${u.username}`}
                className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--bg2)] transition-colors">
                <Avatar src={u.avatarUrl} alt={u.displayName} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--text)]">{u.displayName}</p>
                  <p className="text-xs text-[var(--text2)]">@{u.username}</p>
                  {u.followerCount !== undefined && (
                    <p className="text-xs text-[var(--text3)] mt-0.5">{u.followerCount} followers</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : threadResults.length === 0 ? (
          <div className="p-6 text-center text-[var(--text2)] text-sm">No threads found for "{query}"</div>
        ) : (
          threadResults.map((t) => <PostCard key={t.id} thread={t} />)
        )}
      </main>

      <div className="lg:hidden"><MobileNav /></div>
    </div>
  );
}
