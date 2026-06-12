"use client";
import { Suspense } from "react";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { PostCard, Thread } from "@/components/thread/PostCard";
import { DesktopSidebar } from "@/components/shell/DesktopSidebar";
import { RightPanel } from "@/components/shell/RightPanel";
import { MobileNav } from "@/components/shell/MobileNav";
import { useAuthStore } from "@/stores/auth";
import { toast } from "@/components/ui/Toast";
import { fmtN, cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserResult {
  id: string; username: string; displayName: string;
  avatarUrl: string | null; isVerified: boolean; followerCount?: number;
}

interface TrendingTag { id: string; tag: string; threadCount: number; }

type FilterPill = "All" | "People" | "Threads";

const PILLS: FilterPill[] = ["All", "People", "Threads"];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen w-full justify-center bg-background text-foreground transition-colors duration-200" />}>
      <SearchPageInner />
    </Suspense>
  );
}

function SearchPageInner() {
  const params = useSearchParams();
  const currentUser = useAuthStore((s) => s.user);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [pill, setPill] = useState<FilterPill>("All");
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [threadResults, setThreadResults] = useState<Thread[]>([]);
  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);
  const [loading, setLoading] = useState(false);
  // Track follow state per user: true = following, false = not following
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [followLoadingMap, setFollowLoadingMap] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function toggleFollow(e: React.MouseEvent, userId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) { toast("Please log in to follow", "error"); return; }
    if (userId === currentUser.id) return; // can't follow yourself
    if (followLoadingMap[userId]) return;

    const isFollowing = followingMap[userId] ?? false;
    setFollowLoadingMap((m) => ({ ...m, [userId]: true }));
    try {
      if (isFollowing) {
        await api.delete(`/users/${userId}/follow`);
        setFollowingMap((m) => ({ ...m, [userId]: false }));
      } else {
        await api.post(`/users/${userId}/follow`, {});
        setFollowingMap((m) => ({ ...m, [userId]: true }));
        toast("Following!");
      }
    } catch (err: any) {
      toast(err?.message ?? "Failed to update follow", "error");
    } finally {
      setFollowLoadingMap((m) => ({ ...m, [userId]: false }));
    }
  }

  useEffect(() => {
    api.get<TrendingTag[]>("/hashtags/trending?limit=10")
      .then(setTrendingTags)
      .catch(() =>
        setTrendingTags([
          { id: "1", tag: "design", threadCount: 12400 },
          { id: "2", tag: "typescript", threadCount: 8100 },
          { id: "3", tag: "nextjs", threadCount: 6900 },
          { id: "4", tag: "threads", threadCount: 5200 },
          { id: "5", tag: "opensource", threadCount: 4700 },
          { id: "6", tag: "ai", threadCount: 3800 },
          { id: "7", tag: "webdev", threadCount: 3100 },
        ]),
      );
  }, []);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setUserResults([]); setThreadResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        if (pill === "All" || pill === "People") {
          const res = await api.get<{ data: UserResult[] }>(`/search?q=${encodeURIComponent(query)}&type=users`);
          setUserResults(res.data);
        }
        if (pill === "All" || pill === "Threads") {
          const res = await api.get<{ data: Thread[] }>(`/search?q=${encodeURIComponent(query)}&type=threads`);
          setThreadResults(res.data);
        }
      } catch {} finally { setLoading(false); }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, pill]);

  const noResults =
    !loading && query.trim() &&
    userResults.length === 0 && threadResults.length === 0;

  return (
    <div className="flex min-h-screen w-full justify-center bg-background text-foreground transition-colors duration-200">
      <div className="hidden md:flex flex-col h-screen sticky top-0 border-r border-border w-[252px] flex-shrink-0">
        <DesktopSidebar />
      </div>

      <main className="w-full max-w-[622px] border-r border-border min-h-screen pb-14 md:pb-0">
        {/* Sticky search bar + pills */}
        <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-border">
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-secondary">
              <Search size={18} className="text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="flex-1 bg-transparent text-[16px] text-foreground placeholder:text-muted-foreground outline-none"
              />
              {query && (
                <button onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
            {PILLS.map((p) => (
              <button
                key={p}
                onClick={() => setPill(p)}
                className={cn(
                  "whitespace-nowrap rounded-full px-5 py-2 text-[14px] font-medium transition-colors shrink-0 border",
                  pill === p
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-border text-foreground hover:bg-foreground/5",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {!query.trim() ? (
          /* Trending */
          <div className="px-4 py-5">
            <h2 className="text-[15px] font-semibold text-foreground mb-5">Trending</h2>
            <div className="flex flex-col gap-5">
              {trendingTags.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => setQuery(`#${t.tag}`)}
                  className="w-full flex items-start gap-4 text-left group hover:bg-foreground/5 px-2 py-2 rounded-xl transition-colors"
                >
                  <span className="text-[15px] text-muted-foreground w-5 shrink-0 text-right">{i + 1}</span>
                  <div className="flex flex-col">
                    <p className="text-[12px] text-muted-foreground">Trending</p>
                    <p className="text-[16px] font-semibold text-foreground group-hover:underline">#{t.tag}</p>
                    <p className="text-[12px] text-muted-foreground">{fmtN(t.threadCount)} threads</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : loading ? (
          <div className="p-6 text-center text-muted-foreground text-sm">Searching…</div>
        ) : noResults ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground text-[15px]">No results for &quot;{query}&quot;</p>
          </div>
        ) : (
          <>
            {/* People */}
            {(pill === "All" || pill === "People") && userResults.length > 0 && (
              <div>
                {pill === "All" && (
                  <p className="px-4 pt-4 pb-1 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
                    People
                  </p>
                )}
                {userResults.map((u) => {
                  const isFollowing = followingMap[u.id] ?? false;
                  const isLoadingFollow = followLoadingMap[u.id] ?? false;
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <Link key={u.id} href={`/${u.username}`}
                      className="flex items-center justify-between px-4 py-3 border-b border-border hover:bg-foreground/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar src={u.avatarUrl} alt={u.displayName} size={44} />
                        <div className="flex flex-col">
                          <span className="text-[15px] font-semibold text-foreground">{u.displayName}</span>
                          <span className="text-[13px] text-muted-foreground">@{u.username}</span>
                          {u.followerCount !== undefined && (
                            <span className="text-[13px] text-muted-foreground mt-0.5">
                              {fmtN(u.followerCount)} followers
                            </span>
                          )}
                        </div>
                      </div>
                      {!isSelf && (
                        <button
                          onClick={(e) => toggleFollow(e, u.id)}
                          disabled={isLoadingFollow}
                          className={cn(
                            "px-5 py-1.5 rounded-full border text-[14px] font-medium transition-colors disabled:opacity-50",
                            isFollowing
                              ? "border-border text-muted-foreground hover:border-destructive hover:text-destructive"
                              : "border-foreground bg-foreground text-background hover:opacity-80",
                          )}
                        >
                          {isLoadingFollow ? "…" : isFollowing ? "Following" : "Follow"}
                        </button>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Threads */}
            {(pill === "All" || pill === "Threads") && threadResults.length > 0 && (
              <div>
                {pill === "All" && userResults.length > 0 && (
                  <p className="px-4 pt-4 pb-1 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Threads
                  </p>
                )}
                {threadResults.map((t) => (
                  <PostCard
                    key={t.id}
                    thread={t}
                    onDelete={(id) => setThreadResults((prev) => prev.filter((r) => r.id !== id))}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <div className="hidden lg:flex w-[310px] flex-shrink-0"><RightPanel /></div>
      <div className="md:hidden"><MobileNav /></div>
    </div>
  );
}
