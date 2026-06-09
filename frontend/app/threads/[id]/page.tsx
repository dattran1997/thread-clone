"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { PostCard, Thread } from "@/components/thread/PostCard";
import { Composer } from "@/components/thread/Composer";
import { PostCardSkeleton } from "@/components/ui/Skeleton";
import { DesktopSidebar } from "@/components/shell/DesktopSidebar";
import { MobileNav } from "@/components/shell/MobileNav";
import { BackIcon } from "@/components/ui/Icons";
import { useAuthStore } from "@/stores/auth";

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

  useEffect(() => {
    api.get<ThreadDetail>(`/threads/${id}/replies`)
      .then(setData)
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [id, router]);

  function handleReply(reply: Thread) {
    setData((prev) => prev ? { ...prev, replies: [...prev.replies, reply] } : null);
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex flex-col h-screen sticky top-0 border-r border-[var(--border)]">
        <DesktopSidebar />
      </div>

      <main className="flex-1 max-w-[622px] mx-auto border-r border-[var(--border)] min-h-screen pb-14 lg:pb-0">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-[var(--bg-blur)] backdrop-blur-md border-b border-[var(--border)]">
          <button onClick={() => router.back()} className="p-1 text-[var(--text2)] hover:text-[var(--text)]">
            <BackIcon size={20} />
          </button>
          <span className="font-semibold text-[var(--text)]">Thread</span>
        </div>

        {loading ? (
          [...Array(4)].map((_, i) => <PostCardSkeleton key={i} />)
        ) : data ? (
          <>
            {/* Main thread */}
            <PostCard thread={data.thread} showReplyLine={data.replies.length > 0} />

            {/* Stats bar */}
            <div className="flex gap-6 px-4 py-3 border-b border-[var(--border)] text-sm text-[var(--text2)]">
              <span><strong className="text-[var(--text)]">{data.thread.repostCount}</strong> reposts</span>
              <span><strong className="text-[var(--text)]">{data.thread.likeCount}</strong> likes</span>
              <span><strong className="text-[var(--text)]">{data.thread.replyCount}</strong> replies</span>
            </div>

            {/* Reply composer */}
            {user && (
              <div className="border-b border-[var(--border)]">
                <Composer
                  parentId={id}
                  placeholder={`Reply to @${data.thread.author.username}…`}
                  onSuccess={handleReply}
                />
              </div>
            )}

            {/* Replies */}
            {data.replies.map((r, i) => (
              <PostCard
                key={r.id}
                thread={r}
                showReplyLine={i < data.replies.length - 1}
              />
            ))}

            {data.replies.length === 0 && (
              <div className="text-center py-16 text-sm text-[var(--text2)]">
                No replies yet. Be the first to reply!
              </div>
            )}
          </>
        ) : null}
      </main>

      <div className="lg:hidden"><MobileNav /></div>
    </div>
  );
}
