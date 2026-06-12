"use client";
import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart, MessageCircle, Repeat2, Send, BarChart2, Bookmark,
  MoreHorizontal, Link2, EyeOff, Flag, Trash2, PenLine,
} from "lucide-react";
import { cn, fmtN, relativeTime } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/stores/auth";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Author {
  id: string; username: string; displayName: string;
  avatarUrl: string | null; isVerified: boolean;
}
interface PollOption {
  id: string; text: string; order: number;
  voteCount: number; hasVoted: boolean;
}
interface Poll {
  id: string; options: PollOption[]; totalVotes: number;
  expiresAt: string; userVoteOptionId: string | null;
}
interface Media {
  id: string; url: string; type: "IMAGE" | "VIDEO" | "AUDIO";
  altText: string | null; order: number;
}

export interface Thread {
  id: string; author: Author; text: string;
  parentId: string | null; isGhost: boolean; isEdited: boolean;
  editableUntil: string | null;
  likeCount: number; replyCount: number; repostCount: number;
  quoteCount: number; viewCount: number;
  media: Media[]; poll: Poll | null; hashtags: string[]; topics: string[];
  isLiked: boolean; isReposted: boolean; isSaved: boolean; createdAt: string;
}

interface PostCardProps {
  thread: Thread;
  onDelete?: (id: string) => void;
  showReplyLine?: boolean;
}

// ─── Poll block ───────────────────────────────────────────────────────────────
function PollBlock({ poll, threadId, onVoted }: { poll: Poll; threadId: string; onVoted: () => void }) {
  const user = useAuthStore((s) => s.user);
  const hasVoted = !!poll.userVoteOptionId;
  const expired = new Date() > new Date(poll.expiresAt);

  async function vote(optionId: string) {
    if (!user || hasVoted || expired) return;
    try {
      await api.post(`/threads/${threadId}/poll/vote`, { optionId });
      onVoted();
    } catch { toast("Failed to vote", "error"); }
  }

  return (
    <div className="mt-3 space-y-2">
      {poll.options.map((opt) => {
        const pct = poll.totalVotes > 0 ? Math.round((opt.voteCount / poll.totalVotes) * 100) : 0;
        return (
          <button key={opt.id} onClick={() => vote(opt.id)}
            disabled={hasVoted || expired || !user}
            className={cn(
              "relative w-full rounded-xl border border-border overflow-hidden text-left transition-all hover:border-muted-foreground disabled:cursor-default",
              opt.id === poll.userVoteOptionId && "border-primary",
            )}>
            {(hasVoted || expired) && (
              <div className="absolute inset-y-0 left-0 bg-secondary transition-all" style={{ width: `${pct}%` }} />
            )}
            <div className="relative flex justify-between px-3 py-2.5 text-sm">
              <span className={cn("font-medium text-foreground", opt.id === poll.userVoteOptionId && "text-primary")}>{opt.text}</span>
              {(hasVoted || expired) && <span className="text-muted-foreground">{pct}%</span>}
            </div>
          </button>
        );
      })}
      <p className="text-xs text-muted-foreground">
        {poll.totalVotes} votes · {expired ? "Closed" : `Closes ${relativeTime(poll.expiresAt)}`}
      </p>
    </div>
  );
}

// ─── Quote dialog ─────────────────────────────────────────────────────────────
function QuoteDialog({ thread, onClose }: { thread: Thread; onClose: () => void }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const MAX = 500;

  async function submit() {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      await api.post(`/threads/${thread.id}/quote`, { quoteText: text.trim() });
      toast("Quote posted");
      onClose();
    } catch { toast("Failed to quote", "error"); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div className="w-full max-w-[560px] rounded-2xl bg-secondary border border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button onClick={onClose} className="text-muted-foreground text-sm hover:text-foreground">Cancel</button>
          <span className="text-sm font-semibold text-foreground">Quote thread</span>
          <button onClick={submit} disabled={!text.trim() || loading}
            className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 transition-opacity">
            {loading ? "Posting…" : "Post"}
          </button>
        </div>
        <div className="px-4 py-3 border-b border-border bg-muted">
          <div className="flex items-center gap-2 mb-1">
            <Avatar src={thread.author.avatarUrl} alt={thread.author.displayName} size={20} />
            <span className="text-xs font-semibold text-foreground">{thread.author.displayName}</span>
            <span className="text-xs text-muted-foreground">@{thread.author.username}</span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-3">{thread.text}</p>
        </div>
        <div className="px-4 py-3">
          <textarea value={text} onChange={(e) => setText(e.target.value)} autoFocus rows={3}
            placeholder="Add your thoughts…"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none leading-relaxed" />
          <div className="flex justify-end">
            <span className={cn("text-xs", text.length > MAX ? "text-destructive" : "text-muted-foreground")}>{MAX - text.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Repost dropdown ──────────────────────────────────────────────────────────
function RepostMenu({ thread, reposted, onRepost, onQuote, onClose }:
  { thread: Thread; reposted: boolean; onRepost: () => void; onQuote: () => void; onClose: () => void }) {
  return (
    <div className="absolute bottom-full left-0 mb-1 z-30 bg-secondary border border-border rounded-xl shadow-xl overflow-hidden min-w-[160px]"
      onClick={(e) => e.stopPropagation()}>
      <button onClick={() => { onRepost(); onClose(); }}
        className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-foreground/5 text-foreground transition-colors">
        <Repeat2 size={16} className={reposted ? "text-green-500" : ""} />
        {reposted ? "Remove repost" : "Repost"}
      </button>
      <button onClick={() => { onQuote(); onClose(); }}
        className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-foreground/5 text-foreground transition-colors">
        <MessageCircle size={16} />
        Quote
      </button>
    </div>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────
export function PostCard({ thread, onDelete, showReplyLine = false }: PostCardProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [liked, setLiked] = useState(thread.isLiked);
  const [likeCount, setLikeCount] = useState(thread.likeCount);
  const [reposted, setReposted] = useState(thread.isReposted);
  const [repostCount, setRepostCount] = useState(thread.repostCount);
  const [saved, setSaved] = useState(thread.isSaved);
  const [poll, setPoll] = useState(thread.poll);
  const [heartBurst, setHeartBurst] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showRepostMenu, setShowRepostMenu] = useState(false);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);

  const isOwn = user?.id === thread.author.id;
  const canEdit = !!thread.editableUntil && new Date() < new Date(thread.editableUntil);

  // Record view on mount (fire-and-forget)
  const [viewed] = useState(() => {
    if (typeof window !== "undefined") {
      api.post(`/threads/${thread.id}/view`, {}).catch(() => {});
    }
    return true;
  });
  void viewed;

  // ── Like ──────────────────────────────────────────────────────────────────
  const toggleLike = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user) return;
    const newLiked = !liked;
    setLiked(newLiked); setLikeCount((c) => c + (newLiked ? 1 : -1));
    try {
      if (newLiked) await api.post(`/threads/${thread.id}/like`, {});
      else await api.delete(`/threads/${thread.id}/like`);
    } catch { setLiked(!newLiked); setLikeCount((c) => c + (newLiked ? -1 : 1)); }
  }, [liked, user, thread.id]);

  // ── Double-tap like ────────────────────────────────────────────────────────
  function handleDoubleTap() {
    if (!user || liked) return;
    setHeartBurst(true);
    setTimeout(() => setHeartBurst(false), 800);
    toggleLike();
  }

  // ── Repost ─────────────────────────────────────────────────────────────────
  async function toggleRepost() {
    if (!user) return;
    const newReposted = !reposted;
    setReposted(newReposted); setRepostCount((c) => c + (newReposted ? 1 : -1));
    try {
      if (newReposted) { await api.post(`/threads/${thread.id}/repost`, {}); toast("Reposted"); }
      else { await api.delete(`/threads/${thread.id}/repost`); toast("Removed repost"); }
    } catch { setReposted(!newReposted); setRepostCount((c) => c + (newReposted ? -1 : 1)); }
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function toggleSave(e: React.MouseEvent) {
    e.stopPropagation();
    if (!user) return;
    const newSaved = !saved;
    setSaved(newSaved);
    try {
      if (newSaved) { await api.post(`/threads/${thread.id}/save`, {}); toast("Saved"); }
      else { await api.delete(`/threads/${thread.id}/save`); toast("Removed from saved"); }
    } catch { setSaved(!newSaved); }
  }

  // ── Share ──────────────────────────────────────────────────────────────────
  function share(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/threads/${thread.id}`).then(() => toast("Link copied"));
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setShowMenu(false);
    if (!confirm("Delete this thread?")) return;
    try {
      await api.delete(`/threads/${thread.id}`);
      onDelete?.(thread.id);
      toast("Thread deleted");
    } catch { toast("Failed to delete", "error"); }
  }

  return (
    <>
      {/* Figma structure: flex-col wrapper, separator div at bottom */}
      <div
        onDoubleClick={handleDoubleTap}
        className="relative flex w-full flex-col cursor-pointer hover:bg-foreground/5 transition-colors"
        onClick={() => router.push(`/threads/${thread.id}`)}
      >
        {/* Heart burst overlay */}
        {heartBurst && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <Heart size={72} className="text-destructive animate-[heartPop_0.6s_ease_forwards]" fill="currentColor" />
          </div>
        )}

        <div className="flex gap-3 px-4 py-3">
          {/* Avatar column */}
          <div className="flex flex-col items-center flex-shrink-0">
            <Link href={`/${thread.author.username}`} onClick={(e) => e.stopPropagation()}>
              <Avatar src={thread.author.avatarUrl} alt={thread.author.displayName} size={40} />
            </Link>
            {showReplyLine && <div className="mt-1 w-[2px] grow bg-muted min-h-[20px]" />}
          </div>

          {/* Content */}
          <div className="flex grow flex-col gap-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 min-w-0">
                <Link href={`/${thread.author.username}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[14px] text-foreground hover:underline truncate">
                  {thread.author.displayName}
                </Link>
                {thread.author.isVerified && (
                  <svg width={14} height={14} viewBox="0 0 16 16" fill="#60a5fa" className="flex-shrink-0">
                    <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm3.78 5.22a.75.75 0 0 0-1.06 0L7 8.94 5.28 7.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.06 0l4.25-4.25a.75.75 0 0 0 0-1.06z" />
                  </svg>
                )}
                <span className="text-[13px] text-muted-foreground truncate">@{thread.author.username}</span>
                <span className="text-[13px] text-muted-foreground flex-shrink-0">· {relativeTime(thread.createdAt)}</span>
                {thread.isEdited && <span className="text-[12px] text-muted-foreground">· edited</span>}
              </div>

              {/* Bookmark + More */}
              <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <button onClick={toggleSave}
                  className={cn("text-muted-foreground hover:text-foreground transition-colors",
                    saved && "text-foreground")}>
                  <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
                </button>
                <div className="relative">
                  <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                    className="text-muted-foreground hover:text-foreground transition-colors">
                    <MoreHorizontal size={18} />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-6 z-30 bg-secondary border border-border rounded-xl shadow-xl overflow-hidden min-w-[160px]">
                      <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${location.origin}/threads/${thread.id}`); toast("Link copied"); setShowMenu(false); }}
                        className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-foreground/5 text-foreground transition-colors">
                        <Link2 size={15} /> Copy link
                      </button>
                      {!isOwn && (
                        <button onClick={(e) => { e.stopPropagation(); toast("Muted @" + thread.author.username); setShowMenu(false); }}
                          className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-foreground/5 text-foreground transition-colors">
                          <EyeOff size={15} /> Mute
                        </button>
                      )}
                      {!isOwn && (
                        <button onClick={(e) => { e.stopPropagation(); toast("Report submitted"); setShowMenu(false); }}
                          className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-foreground/5 text-destructive transition-colors">
                          <Flag size={15} /> Report
                        </button>
                      )}
                      {isOwn && canEdit && (
                        <Link href={`/threads/${thread.id}/edit`} onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-foreground/5 text-foreground transition-colors">
                          <PenLine size={15} /> Edit
                        </Link>
                      )}
                      {isOwn && (
                        <button onClick={handleDelete}
                          className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-foreground/5 text-destructive transition-colors">
                          <Trash2 size={15} /> Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Thread text */}
            <p className="text-[15px] leading-[1.5] text-foreground whitespace-pre-wrap break-words">
              {thread.text}
            </p>

            {/* Audio media — rendered separately as a horizontal strip */}
            {thread.media.filter((m) => m.type === "AUDIO").map((m) => (
              <div key={m.id} className="mt-2 flex items-center gap-2 rounded-xl bg-secondary border border-border px-3 py-2">
                <audio src={m.url} controls className="h-8 w-full" style={{ colorScheme: "dark" }} />
              </div>
            ))}

            {/* Image/Video grid */}
            {thread.media.filter((m) => m.type !== "AUDIO").length > 0 && (
              <div className={cn("mt-2 gap-2",
                thread.media.filter((m) => m.type !== "AUDIO").length === 1 ? "flex" : "grid grid-cols-2")}>
                {thread.media.filter((m) => m.type !== "AUDIO").slice(0, 4).map((m) => (
                  <div key={m.id} className="relative aspect-[4/3] bg-muted rounded-xl overflow-hidden border border-border">
                    {m.type === "IMAGE" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.url} alt={m.altText ?? ""} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <video src={m.url} className="absolute inset-0 w-full h-full object-cover" controls />
                    )}
                  </div>
                ))}
                {thread.media.filter((m) => m.type !== "AUDIO").length > 4 && (
                  <div className="aspect-[4/3] bg-muted rounded-xl flex items-center justify-center text-sm text-muted-foreground">
                    +{thread.media.filter((m) => m.type !== "AUDIO").length - 4}
                  </div>
                )}
              </div>
            )}

            {/* Poll */}
            {poll && (
              <PollBlock poll={poll} threadId={thread.id}
                onVoted={async () => {
                  const updated = await api.get<Thread>(`/threads/${thread.id}`);
                  setPoll(updated.poll);
                }} />
            )}

            {/* Action row — matches Figma gap-4 layout */}
            <div className="mt-2 flex items-center justify-between text-muted-foreground" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-4">
                {/* Like */}
                <button onClick={(e) => toggleLike(e)}
                  className={cn("flex items-center gap-1.5 transition-colors hover:text-destructive",
                    liked && "text-destructive")}>
                  <Heart size={20} fill={liked ? "currentColor" : "none"}
                    className={liked ? "animate-[bounceHeart_0.3s_ease]" : ""} />
                  <span className="text-[13px]">{fmtN(likeCount)}</span>
                </button>

                {/* Reply */}
                <Link href={`/threads/${thread.id}`}
                  className="flex items-center gap-1.5 transition-colors hover:text-foreground">
                  <MessageCircle size={20} />
                  <span className="text-[13px]">{fmtN(thread.replyCount)}</span>
                </Link>

                {/* Repost */}
                <div className="relative">
                  <button onClick={() => setShowRepostMenu(!showRepostMenu)}
                    className={cn("flex items-center gap-1.5 transition-colors hover:text-foreground",
                      reposted && "text-green-500")}>
                    <Repeat2 size={20} />
                    <span className="text-[13px]">{fmtN(repostCount)}</span>
                  </button>
                  {showRepostMenu && (
                    <RepostMenu thread={thread} reposted={reposted}
                      onRepost={toggleRepost}
                      onQuote={() => setShowQuoteDialog(true)}
                      onClose={() => setShowRepostMenu(false)} />
                  )}
                </div>

                {/* Share */}
                <button onClick={share}
                  className="flex items-center gap-1.5 transition-colors hover:text-foreground">
                  <Send size={20} />
                </button>
              </div>

              {/* Views */}
              <div className="flex items-center gap-1.5 text-muted-foreground/80">
                <BarChart2 size={16} />
                <span className="text-[12px]">{fmtN(thread.viewCount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Figma-style separator at bottom */}
        <div className="h-[1px] w-full bg-border" />

        {/* Close menus when clicking elsewhere */}
        {(showMenu || showRepostMenu) && (
          <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowRepostMenu(false); }} />
        )}
      </div>

      {showQuoteDialog && (
        <QuoteDialog thread={thread} onClose={() => setShowQuoteDialog(false)} />
      )}
    </>
  );
}
