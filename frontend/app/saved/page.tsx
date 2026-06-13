"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { PostCard, Thread } from "@/components/thread/PostCard";
import { PostCardSkeleton } from "@/components/ui/Skeleton";
import { DesktopSidebar } from "@/components/shell/DesktopSidebar";
import { MobileNav } from "@/components/shell/MobileNav";
import { RightPanel } from "@/components/shell/RightPanel";
import { ChevronLeft, Bookmark } from "lucide-react";

export default function SavedPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    api.get<{ data: Thread[]; nextCursor: string | null; hasMore: boolean }>("/threads/saved")
      .then((r) => {
        setThreads(r.data);
        setCursor(r.nextCursor);
        setHasMore(r.hasMore);
      })
      .catch(() => setThreads([]))
      .finally(() => setLoading(false));
  }, [user, router]);

  function handleDelete(id: string) {
    setThreads((prev) => prev.filter((t) => t.id !== id));
  }

  // When a thread is unsaved, remove it from the list
  function handleUnsave(id: string) {
    setThreads((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="flex min-h-screen w-full justify-center bg-background text-foreground transition-colors duration-200">
      <div className="hidden md:flex flex-col h-screen sticky top-0 border-r border-border w-[252px] flex-shrink-0">
        <DesktopSidebar />
      </div>

      <main className="w-full max-w-[622px] border-r border-border min-h-screen pb-14 md:pb-0">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4 bg-background/90 backdrop-blur-xl border-b border-border">
          <button
            onClick={() => typeof window !== "undefined" && window.history.length > 1 ? router.back() : router.push("/")}
            className="rounded-full p-2 text-foreground hover:bg-foreground/10 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-semibold text-foreground">Saved</span>
        </div>

        {loading ? (
          [...Array(4)].map((_, i) => <PostCardSkeleton key={i} />)
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
              <Bookmark size={28} className="text-muted-foreground" />
            </div>
            <p className="text-[17px] font-semibold text-foreground">No saved posts yet</p>
            <p className="text-[14px] text-muted-foreground">
              Tap the bookmark icon on any post to save it here.
            </p>
          </div>
        ) : (
          <>
            {threads.map((t) => (
              <PostCard
                key={t.id}
                thread={t}
                onDelete={handleDelete}
                onUnsave={handleUnsave}
              />
            ))}
            {hasMore && (
              <button
                className="w-full py-4 text-[14px] text-primary hover:opacity-80 transition-opacity"
                onClick={() => {
                  if (!cursor) return;
                  api.get<{ data: Thread[]; nextCursor: string | null; hasMore: boolean }>(
                    `/threads/saved?cursor=${cursor}`,
                  ).then((r) => {
                    setThreads((prev) => [...prev, ...r.data]);
                    setCursor(r.nextCursor);
                    setHasMore(r.hasMore);
                  });
                }}
              >
                Load more
              </button>
            )}
          </>
        )}
      </main>

      <div className="hidden lg:flex w-[310px] flex-shrink-0"><RightPanel /></div>
      <div className="md:hidden"><MobileNav /></div>
    </div>
  );
}
