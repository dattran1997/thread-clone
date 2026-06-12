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
import { DEMO_THREADS } from "@/lib/demo-data";

type FeedTab = "for-you" | "following";

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
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

  // "See new posts" pill after 5s idle
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

  // Infinite scroll
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
    <div className="flex min-h-screen w-full justify-center bg-background text-foreground transition-colors duration-200">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col h-screen sticky top-0 border-r border-border w-[252px] flex-shrink-0">
        <DesktopSidebar />
      </div>

      <main className="w-full max-w-[622px] border-r border-border min-h-screen pt-14 pb-14 md:pt-0 md:pb-0">
        {/* Mobile logo bar */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 flex items-center justify-center border-b border-border bg-background/80 backdrop-blur-xl">
          <Logo size={28} />
        </div>

        {/* Tab bar */}
        <div className="sticky top-14 md:top-0 z-20 flex border-b border-border bg-background/90 backdrop-blur-xl">
          {(["for-you", "following"] as FeedTab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn(
                "relative flex-1 py-4 text-[15px] font-medium transition-colors",
                tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}>
              {t === "for-you" ? "For you" : "Following"}
              {tab === t && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Composer */}
        {isAuthenticated && (
          <Composer onSuccess={(t) => setThreads((prev) => [t, ...prev])} />
        )}

        {/* New posts pill */}
        {showPill && (
          <div className="flex justify-center sticky top-24 z-20 pointer-events-none">
            <button
              onClick={() => { setShowPill(false); window.scrollTo({ top: 0, behavior: "smooth" }); fetchFeed(true); }}
              className="pointer-events-auto px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-lg animate-[slideUp_0.3s_ease]"
            >
              See new posts
            </button>
          </div>
        )}

        {/* Content */}
        {!hasHydrated ? (
          // Still reading from localStorage — show skeleton to prevent demo flash
          [...Array(5)].map((_, i) => <PostCardSkeleton key={i} />)
        ) : loading && threads.length === 0 && isAuthenticated ? (
          [...Array(5)].map((_, i) => <PostCardSkeleton key={i} />)
        ) : !isAuthenticated ? (
          <>
            {/* Welcome CTA strip */}
            <div className="flex items-center justify-between gap-4 px-4 py-4 border-b border-border bg-secondary/40">
              <div className="flex items-center gap-3">
                <Logo size={28} />
                <div>
                  <p className="text-[14px] font-semibold text-foreground leading-tight">Join Threads</p>
                  <p className="text-[12px] text-muted-foreground leading-tight">Follow people. See what&apos;s happening.</p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <a href="/login"
                  className="px-4 py-2 rounded-xl border border-border text-[13px] font-semibold text-foreground hover:bg-foreground/5 transition-colors">
                  Log in
                </a>
                <a href="/register"
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] font-bold hover:opacity-90 transition-opacity border border-transparent">
                  Sign up
                </a>
              </div>
            </div>

            {/* Demo posts — blurred at bottom to invite sign-up */}
            <div className="relative">
              {DEMO_THREADS.map((t) => (
                <PostCard key={t.id} thread={t} />
              ))}
              {/* Fade-to-blur gate */}
              <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-background to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end pb-8 gap-4 pointer-events-none">
                <div className="pointer-events-auto flex flex-col items-center gap-3">
                  <a href="/register"
                    className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-[15px] hover:opacity-90 transition-opacity border border-transparent shadow-xl">
                    Create account to see more
                  </a>
                  <a href="/login" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
                    Already have an account? Log in
                  </a>
                </div>
              </div>
            </div>
          </>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <p className="text-lg font-semibold text-foreground">
              {tab === "following" ? "Follow more people" : "Nothing here yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {tab === "following" ? "Follow people to see their threads here." : "Post your first thread!"}
            </p>
          </div>
        ) : (
          <>
            {threads.map((t) => <PostCard key={t.id} thread={t} onDelete={handleDelete} />)}
            <div ref={bottomRef} className="h-4" />
            {!hasMore && threads.length > 0 && (
              <p className="text-center text-[14px] text-primary py-12">You&apos;re all caught up ✦</p>
            )}
            {loading && hasMore && (
              <div className="py-4">{[...Array(2)].map((_, i) => <PostCardSkeleton key={i} />)}</div>
            )}
          </>
        )}
      </main>

      <div className="hidden lg:flex flex-col w-[310px] flex-shrink-0"><RightPanel /></div>
      <div className="md:hidden"><MobileNav /></div>
    </div>
  );
}
