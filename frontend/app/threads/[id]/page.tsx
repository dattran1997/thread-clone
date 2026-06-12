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

            {/* Stats bar */}
            <div className="flex gap-6 px-4 py-3 border-b border-border text-sm text-muted-foreground">
              <span><strong className="text-foreground">{data.thread.repostCount}</strong> reposts</span>
              <span><strong className="text-foreground">{data.thread.likeCount}</strong> likes</span>
              <span><strong className="text-foreground">{data.thread.replyCount}</strong> replies</span>
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
