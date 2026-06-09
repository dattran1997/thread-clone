"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { PostCard, Thread } from "@/components/thread/PostCard";
import { Composer } from "@/components/thread/Composer";
import { PostCardSkeleton } from "@/components/ui/Skeleton";
import { DesktopSidebar } from "@/components/shell/DesktopSidebar";
import { RightPanel } from "@/components/shell/RightPanel";
import { MobileNav } from "@/components/shell/MobileNav";
import { Logo } from "@/components/shell/Logo";
import { cn } from "@/lib/utils";

type FeedTab = "for-you" | "following";

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<FeedTab>("for-you");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [showPill, setShowPill] = useState(false);
  const pillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAuthenticated = !!user;

  const fetchFeed = useCallback(async (reset = false) => {
    if (!isAuthenticated) { setLoading(false); return; }
    setLoading(true);
    try {
      const endpoint = tab === "for-you" ? "/feed/for-you" : "/feed/following";
      const params = !reset && cursor ? `?cursor=${cursor}` : "";
      const res = await api.get<{ data: Thread[]; nextCursor: string | null; hasMore: boolean }>(
        endpoint + params,
      );
      setThreads((prev) => reset ? res.data : [...prev, ...res.data]);
      setCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch {}
    setTimeout(() => setLoading(false), reset ? 650 : 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, cursor, isAuthenticated]);

  useEffect(() => {
    setThreads([]); setCursor(null); setHasMore(false); setShowPill(false);
    fetchFeed(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isAuthenticated]);

  useEffect(() => {
    const startTimer = () => {
      if (pillTimerRef.current) clearTimeout(pillTimerRef.current);
      pillTimerRef.current = setTimeout(() => setShowPill(true), 5000);
    };
    startTimer();
    const events = ["mousemove", "keydown", "scroll", "touchstart"];
    const reset = () => { setShowPill(false); startTimer(); };
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      if (pillTimerRef.current) clearTimeout(pillTimerRef.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [tab]);

  useEffect(() => {
    observerRef.current?.disconnect();
    if (!bottomRef.current || !hasMore || loading) return;
    observerRef.current = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) fetchFeed(false); },
      { rootMargin: "200px" },
    );
    observerRef.current.observe(bottomRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, fetchFeed]);

  const handleDelete = (id: string) => setThreads((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex flex-col h-screen sticky top-0 border-r border-[var(--border)]">
        <DesktopSidebar />
      </div>

      <main className="flex-1 max-w-[622px] w-full mx-auto border-r border-[var(--border)] min-h-screen pb-20 lg:pb-0">
        <div className="lg:hidden sticky top-0 z-30 flex items-center justify-center py-3 border-b border-[var(--border)] bg-[var(--bg-blur)] backdrop-blur-md">
          <Logo size={28} />
        </div>

        <div className="sticky top-[52px] lg:top-0 z-20 flex border-b border-[var(--border)] bg-[var(--bg-blur)] backdrop-blur-md">
          {(["for-you", "following"] as FeedTab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
                tab === t ? "border-[var(--accent)] text-[var(--text)]" : "border-transparent text-[var(--text2)] hover:text-[var(--text)]",
              )}>
              {t === "for-you" ? "For you" : "Following"}
            </button>
          ))}
        </div>

        {isAuthenticated && (
          <div className="border-b border-[var(--border)]">
            <Composer onSuccess={(t) => setThreads((prev) => [t, ...prev])} />
          </div>
        )}

        {showPill && (
          <div className="flex justify-center sticky top-24 z-20 pointer-events-none">
            <button onClick={() => { setShowPill(false); window.scrollTo({ top: 0, behavior: "smooth" }); fetchFeed(true); }}
              className="pointer-events-auto px-5 py-2 rounded-full bg-[var(--accent)] text-[var(--accent-text)] text-sm font-semibold shadow-lg animate-[slideUp_0.3s_ease]">
              See new posts
            </button>
          </div>
        )}

        {loading && threads.length === 0 && isAuthenticated ? (
          [...Array(5)].map((_, i) => <PostCardSkeleton key={i} />)
        ) : !isAuthenticated ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6 gap-4">
            <Logo size={48} />
            <h1 className="text-2xl font-bold text-[var(--text)]">Welcome to Threads</h1>
            <p className="text-[var(--text2)]">Sign in to see your feed and post threads.</p>
            <a href="/login" className="px-6 py-3 rounded-xl bg-[var(--accent)] text-[var(--accent-text)] font-semibold hover:opacity-90">
              Log in
            </a>
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <p className="text-lg font-semibold text-[var(--text)]">
              {tab === "following" ? "Follow more people" : "Nothing here yet"}
            </p>
            <p className="text-sm text-[var(--text2)] mt-1">
              {tab === "following" ? "Follow people to see their threads here." : "Post your first thread!"}
            </p>
          </div>
        ) : (
          <>
            {threads.map((t) => <PostCard key={t.id} thread={t} onDelete={handleDelete} />)}
            <div ref={bottomRef} className="h-4" />
            {!hasMore && threads.length > 0 && (
              <p className="text-center text-sm text-[var(--text2)] py-8">You&apos;re all caught up ✦</p>
            )}
            {loading && hasMore && (
              <div className="py-4">{[...Array(2)].map((_, i) => <PostCardSkeleton key={i} />)}</div>
            )}
          </>
        )}
      </main>

      <div className="hidden xl:block"><RightPanel /></div>
      <div className="lg:hidden"><MobileNav /></div>
    </div>
  );
}
