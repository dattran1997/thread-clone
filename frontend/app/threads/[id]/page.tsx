"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { PostCard, Thread } from "@/components/thread/PostCard";
import { Composer } from "@/components/thread/Composer";
import { PostCardSkeleton } from "@/components/ui/Skeleton";
import { DesktopSidebar } from "@/components/shell/DesktopSidebar";
import { MobileNav } from "@/components/shell/MobileNav";
import { ChevronLeft } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { RightPanel } from "@/components/shell/RightPanel";

interface ThreadDetail {
  thread: Thread;
  replies: Thread[];
  nextCursor: string | null;
  hasMore: boolean;
}

export default function ThreadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<ThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Live stats bar counts — kept separate so they can update without re-fetching
  const [likeCount, setLikeCount] = useState(0);
  const [repostCount, setRepostCount] = useState(0);

  useEffect(() => {
    api.get<ThreadDetail>(`/threads/${id}/replies`)
      .then((d) => {
        setData(d);
        setLikeCount(d.thread.likeCount);
        setRepostCount(d.thread.repostCount);
        // Count the view only when the user actually opens the thread detail page
        api.post(`/threads/${id}/view`, {}).catch(() => {});
      })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [id, router]);

  // Keep stats bar in sync with live socket updates from PostCard's emitThreadUpdate
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        threadId: string; likeCount?: number; repostCount?: number;
      };
      if (detail.threadId !== id) return;
      if (detail.likeCount   !== undefined) setLikeCount(detail.likeCount);
      if (detail.repostCount !== undefined) setRepostCount(detail.repostCount);
    };
    window.addEventListener("thread-updated", handler);
    return () => window.removeEventListener("thread-updated", handler);
  }, [id]);

  // Real-time replies from other users — appended to the reply list as they arrive
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { threadId: string; reply: Thread };
      if (detail.threadId !== id) return;
      // Guard against appending a reply the current user just posted (handleReply already did it)
      setData((prev) => {
        if (!prev) return null;
        if (prev.replies.some((r) => r.id === detail.reply.id)) return prev; // dedup
        return {
          ...prev,
          thread: { ...prev.thread, replyCount: prev.thread.replyCount + 1 },
          replies: [...prev.replies, detail.reply],
        };
      });
    };
    window.addEventListener("thread-new-reply", handler);
    return () => window.removeEventListener("thread-new-reply", handler);
  }, [id]);

  function handleReply(reply: Thread) {
    setData((prev) => {
      if (!prev) return null;
      // Guard: the socket's new-reply event may have already added this reply
      if (prev.replies.some((r) => r.id === reply.id)) return prev;
      return {
        ...prev,
        thread: { ...prev.thread, replyCount: prev.thread.replyCount + 1 },
        replies: [...prev.replies, reply],
      };
    });
  }

  return (
    <div className="flex min-h-screen w-full justify-center bg-background text-foreground transition-colors duration-200">
      <div className="hidden md:flex flex-col h-screen sticky top-0 border-r border-border w-[252px] flex-shrink-0">
        <DesktopSidebar />
      </div>

      <main className="w-full max-w-[622px] border-r border-border min-h-screen pb-14 md:pb-0">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4 bg-background/90 backdrop-blur-xl border-b border-border">
          <button onClick={() => router.back()}
            className="rounded-full p-2 text-foreground hover:bg-foreground/10 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <span className="font-semibold text-foreground">Thread</span>
        </div>

        {loading ? (
          [...Array(4)].map((_, i) => <PostCardSkeleton key={i} />)
        ) : data ? (
          <>
            {/* Main thread — delete redirects back to feed */}
            <PostCard
              thread={data.thread}
              showReplyLine={data.replies.length > 0}
              onDelete={() => router.replace("/")}
            />

            {/* Stats bar — uses live local state, not the frozen snapshot */}
            <div className="flex gap-6 px-4 py-3 border-b border-border text-sm text-muted-foreground">
              <span><strong className="text-foreground">{repostCount}</strong> reposts</span>
              <span><strong className="text-foreground">{likeCount}</strong> likes</span>
            </div>

            {/* Reply composer */}
            {user && (
              <Composer
                parentId={data.thread.id}
                placeholder={`Reply to @${data.thread.author.username}…`}
                onSuccess={handleReply}
              />
            )}

            {/* Replies */}
            {data.replies.map((r, i) => (
              <PostCard
                key={r.id}
                thread={r}
                showReplyLine={i < data.replies.length - 1}
                onDelete={(deletedId) =>
                  setData((prev) =>
                    prev ? { ...prev, replies: prev.replies.filter((x) => x.id !== deletedId) } : null,
                  )
                }
              />
            ))}

            {data.replies.length === 0 && (
              <div className="text-center py-16 text-sm text-muted-foreground">
                No replies yet. Be the first to reply!
              </div>
            )}
          </>
        ) : null}
      </main>

      <div className="hidden lg:flex w-[310px] flex-shrink-0"><RightPanel /></div>
      <div className="md:hidden"><MobileNav /></div>
    </div>
  );
}
