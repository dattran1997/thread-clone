"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { connectSocket } from "@/lib/ws";
import {
  Heart, MessageCircle, Repeat2, Send, BarChart2, Bookmark,
  MoreHorizontal, Link2, Trash2, PenLine, X,
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
  onUnsave?: (id: string) => void;
  showReplyLine?: boolean;
}

// ─── Poll block ───────────────────────────────────────────────────────────────
function PollBlock({ poll: initialPoll, threadId, onVoted }: {
  poll: Poll; threadId: string; onVoted: (updated: Poll) => void;
}) {
  const user = useAuthStore((s) => s.user);
  const [poll, setPoll] = useState(initialPoll);
  const votingRef = useRef(false);
  // Tracks whether the user voted in THIS session — prevents the sync-effect from
  // overwriting local state with stale feed data after an optimistic update.
  const hasVotedRef = useRef(!!initialPoll.userVoteOptionId);

  const hasVoted = !!poll.userVoteOptionId;
  const expired  = new Date() > new Date(poll.expiresAt);

  // Results are shown only when the viewer has actually voted or the poll closed.
  // Owners are treated the same as any other user: they vote first, then see results.
  const showResults = hasVoted || expired;

  // Always derive totalVotes from the live options array so it is guaranteed
  // to be consistent with individual voteCount values — prevents > 100 % display.
  const totalVotes = poll.options.reduce((sum, o) => sum + (o.voteCount ?? 0), 0);
  const maxVotes   = poll.options.reduce((max, o) => Math.max(max, o.voteCount ?? 0), 0);

  // Sync incoming prop changes only while the user has NOT voted locally.
  // Once they vote (hasVotedRef = true) we own the local state.
  useEffect(() => {
    if (!hasVotedRef.current) setPoll(initialPoll);
  }, [initialPoll]);

  async function vote(optionId: string) {
    if (!user)                                    { toast("Log in to vote", "error"); return; }
    if (hasVoted || expired || votingRef.current) return;

    votingRef.current   = true;
    hasVotedRef.current = true; // lock before setState so the sync-effect never overwrites

    // Optimistic update — feels instant even before the network round-trip
    const optimistic: Poll = {
      ...poll,
      userVoteOptionId: optionId,
      totalVotes: totalVotes + 1,
      options: poll.options.map((o) =>
        o.id === optionId ? { ...o, voteCount: (o.voteCount ?? 0) + 1 } : o,
      ),
    };
    setPoll(optimistic);

    try {
      // Backend returns the full updated thread; pull the authoritative poll from it.
      const updatedThread = await api.post<any>(`/threads/${threadId}/poll/vote`, { optionId });
      const serverPoll: Poll = updatedThread?.poll ?? optimistic;
      // Settle on the server's numbers (voteCount, totalVotes, userVoteOptionId all correct)
      setPoll(serverPoll);
      onVoted(serverPoll);
    } catch (err: any) {
      const alreadyVoted = (err?.message ?? "").toLowerCase().includes("already");
      if (alreadyVoted) {
        // Server says "already voted" — keep optimistic state, treat as success
        onVoted(optimistic);
      } else {
        // Real error: roll back and let the user try again
        hasVotedRef.current = false;
        setPoll(initialPoll);
        toast(err?.message ?? "Failed to vote", "error");
      }
    } finally {
      votingRef.current = false;
    }
  }

  return (
    <div className="mt-3 space-y-1.5" onClick={(e) => e.stopPropagation()}>
      {poll.options.map((opt) => {
        const voteCount = opt.voteCount ?? 0;
        const pct       = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
        const isChosen  = opt.id === poll.userVoteOptionId;
        const isLeading = maxVotes > 0 && voteCount === maxVotes;

        /* ── Results view (voted / owner / expired) ── */
        if (showResults) {
          return (
            <div key={opt.id} className="flex items-center gap-2.5">
              {/* Bar + label */}
              <div className="relative flex-1 h-10 rounded-xl overflow-hidden bg-foreground/[0.06]">
                {/* Animated fill */}
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-xl transition-[width] duration-700 ease-out",
                    isChosen ? "bg-primary/25" : "bg-foreground/[0.10]",
                  )}
                  style={{ width: `${pct}%` }}
                />
                {/* Text + checkmark */}
                <div className="relative flex items-center h-full px-3 gap-1.5 min-w-0">
                  {isChosen && (
                    <svg
                      width="13" height="13" viewBox="0 0 12 12"
                      fill="none" stroke="currentColor"
                      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                      className="flex-shrink-0 text-primary"
                    >
                      <path d="M1.5 6 4.5 9 10.5 3" />
                    </svg>
                  )}
                  <span className={cn(
                    "text-[14px] truncate",
                    isChosen  ? "font-bold text-primary"
                    : isLeading ? "font-semibold text-foreground"
                    :             "font-medium text-foreground/75",
                  )}>
                    {opt.text}
                  </span>
                </div>
              </div>
              {/* Percentage — outside the bar so it's always readable */}
              <span className={cn(
                "text-[13px] tabular-nums w-9 text-right flex-shrink-0",
                isChosen   ? "font-bold text-primary"
                : isLeading ? "font-semibold text-foreground"
                :             "text-muted-foreground",
              )}>
                {pct}%
              </span>
            </div>
          );
        }

        /* ── Pre-vote button ── */
        return (
          <button
            key={opt.id}
            onClick={() => vote(opt.id)}
            className={cn(
              "w-full text-left px-4 py-2.5 rounded-xl border text-[14px] font-medium",
              "border-border/60 text-foreground transition-all",
              "hover:border-foreground/35 hover:bg-foreground/[0.04] active:scale-[0.99]",
            )}
          >
            {opt.text}
          </button>
        );
      })}

      {/* Footer — vote count + status */}
      <p className="text-[12px] text-muted-foreground pt-0.5">
        {totalVotes.toLocaleString()} {totalVotes === 1 ? "vote" : "votes"}
        {" · "}
        {expired
          ? "Final results"
          : `Closes ${relativeTime(poll.expiresAt)}`
        }
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

// ─── Delete confirm modal ─────────────────────────────────────────────────────
function DeleteConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[360px] rounded-2xl bg-secondary border border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-5 text-center">
          <p className="text-[17px] font-bold text-foreground">Delete thread?</p>
          <p className="text-[14px] text-muted-foreground mt-1">This can&apos;t be undone.</p>
        </div>
        <div className="border-t border-border">
          <button
            onClick={onConfirm}
            className="w-full py-4 text-[16px] font-semibold text-destructive hover:bg-destructive/5 transition-colors border-b border-border"
          >
            Delete
          </button>
          <button
            onClick={onCancel}
            className="w-full py-4 text-[16px] font-medium text-foreground hover:bg-foreground/5 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Report dialog ────────────────────────────────────────────────────────────
const REPORT_REASONS = [
  "Spam",
  "Harassment or bullying",
  "Hate speech",
  "Misinformation",
  "Violence or dangerous content",
  "Copyright violation",
  "Other",
];

function ReportDialog({ thread, onClose }: { thread: Thread; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!reason || loading) return;
    setLoading(true);
    try {
      await api.post("/reports", {
        targetType: "THREAD",
        targetId: thread.id,
        reason,
        note: note.trim() || undefined,
      });
      setDone(true);
      setTimeout(onClose, 1500);
    } catch {
      toast("Failed to submit report", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div className="w-full max-w-[400px] rounded-2xl bg-secondary border border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
          <span className="text-sm font-semibold text-foreground">Report</span>
          <div className="w-6" />
        </div>

        {done ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[15px] font-semibold text-foreground">Thanks for your report</p>
            <p className="text-[13px] text-muted-foreground mt-1">We'll review it and take action if needed.</p>
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-3">
            <p className="text-[14px] text-muted-foreground">Why are you reporting this?</p>
            <div className="flex flex-col gap-1">
              {REPORT_REASONS.map((r) => (
                <button key={r} onClick={() => setReason(r)}
                  className={cn(
                    "text-left px-3 py-2.5 rounded-xl text-[14px] transition-colors",
                    reason === r
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-foreground hover:bg-foreground/5",
                  )}>
                  {r}
                </button>
              ))}
            </div>
            {reason && (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Additional details (optional)"
                rows={2}
                maxLength={500}
                className="bg-background border border-border rounded-xl px-3 py-2 text-[14px] text-foreground placeholder:text-muted-foreground resize-none outline-none focus:border-primary transition-colors"
              />
            )}
            <button
              onClick={submit}
              disabled={!reason || loading}
              className="w-full py-3 rounded-xl bg-destructive text-white text-[14px] font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {loading ? "Submitting…" : "Submit report"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────
export function PostCard({ thread, onDelete, onUnsave, showReplyLine = false }: PostCardProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [liked, setLiked] = useState(thread.isLiked);
  const [likeCount, setLikeCount] = useState(thread.likeCount);
  const [reposted, setReposted] = useState(thread.isReposted);
  const [repostCount, setRepostCount] = useState(thread.repostCount);
  const [replyCount, setReplyCount] = useState(thread.replyCount);

  // Sync replyCount when the prop changes (e.g. handleReply updates data.thread)
  useEffect(() => { setReplyCount(thread.replyCount); }, [thread.replyCount]);
  const [saved, setSaved] = useState(thread.isSaved);
  const [poll, setPoll] = useState(thread.poll);
  const [heartBurst, setHeartBurst] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isOwn = user?.id === thread.author.id;
  const canEdit = !!thread.editableUntil && new Date() < new Date(thread.editableUntil);

  // ── Subscribe to real-time count updates for this thread ───────────────────
  useEffect(() => {
    const accessToken = (() => {
      try { return JSON.parse(localStorage.getItem("threads-auth") ?? "{}")?.state?.accessToken ?? null; } catch { return null; }
    })();
    if (!accessToken) return;

    const socket = connectSocket(accessToken);
    socket.emit("join-thread", thread.id);

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { threadId: string; likeCount?: number; repostCount?: number; replyCount?: number };
      if (detail.threadId !== thread.id) return;
      if (detail.likeCount !== undefined) setLikeCount(detail.likeCount);
      if (detail.repostCount !== undefined) setRepostCount(detail.repostCount);
      if (detail.replyCount !== undefined) setReplyCount(detail.replyCount);
    };
    window.addEventListener("thread-updated", handler);

    return () => {
      socket.emit("leave-thread", thread.id);
      window.removeEventListener("thread-updated", handler);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.id]);

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
      else { await api.delete(`/threads/${thread.id}/save`); toast("Removed from saved"); onUnsave?.(thread.id); }
    } catch { setSaved(!newSaved); }
  }

  // ── Share ──────────────────────────────────────────────────────────────────
  function share(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/threads/${thread.id}`).then(() => toast("Link copied"));
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    setShowMenu(false);
    setShowDeleteConfirm(true);
  }

  async function confirmDelete() {
    setShowDeleteConfirm(false);
    try {
      await api.delete(`/threads/${thread.id}`);
      onDelete?.(thread.id);
      toast("Thread deleted");
    } catch { toast("Failed to delete", "error"); }
  }

  return (
    <>
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
                {thread.isGhost && (
                  <span className="flex items-center gap-0.5 text-[11px] text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-full px-1.5 py-0.5 flex-shrink-0" title="Ghost post — disappears in 24h">
                    👻 ghost
                  </span>
                )}
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
                    <div className="absolute right-0 top-6 z-30 bg-secondary border border-border rounded-xl shadow-xl overflow-hidden min-w-[180px]">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${location.origin}/threads/${thread.id}`); toast("Link copied"); setShowMenu(false); }}
                        className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-foreground/5 text-foreground transition-colors">
                        <Link2 size={15} /> Copy link
                      </button>
                      {isOwn && canEdit && (
                        <Link href={`/threads/${thread.id}/edit`} onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-foreground/5 text-foreground transition-colors">
                          <PenLine size={15} /> Edit
                        </Link>
                      )}
                      {isOwn && (
                        <button onClick={handleDeleteClick}
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

            {/* Audio media */}
            {thread.media.filter((m) => m.type === "AUDIO").map((m) => (
              <div key={m.id} className="mt-2 flex items-center gap-2 rounded-xl bg-secondary border border-border px-3 py-2">
                <audio src={m.url} controls className="h-8 w-full" style={{ colorScheme: "dark" }} />
              </div>
            ))}

            {/* Image/Video grid */}
            {(() => {
              const visuals = thread.media.filter((m) => m.type !== "AUDIO");
              if (!visuals.length) return null;
              const display = visuals.slice(0, 4);
              return (
                <div className={cn("mt-2 gap-2",
                  display.length === 1 ? "block" : "grid grid-cols-2")}>
                  {display.map((m) => (
                    <div key={m.id} className="relative w-full aspect-[4/3] bg-muted rounded-xl overflow-hidden border border-border">
                      {m.type === "IMAGE" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.url}
                          alt={m.altText ?? ""}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.style.display = "none";
                            // Show placeholder text in parent
                            const parent = img.parentElement;
                            if (parent && !parent.querySelector(".img-error")) {
                              const msg = document.createElement("div");
                              msg.className = "img-error absolute inset-0 flex items-center justify-center text-xs text-muted-foreground";
                              msg.textContent = "Image unavailable";
                              parent.appendChild(msg);
                            }
                          }}
                        />
                      ) : (
                        <video src={m.url} className="absolute inset-0 w-full h-full object-cover" controls />
                      )}
                    </div>
                  ))}
                  {visuals.length > 4 && (
                    <div className="aspect-[4/3] bg-muted rounded-xl flex items-center justify-center text-sm text-muted-foreground">
                      +{visuals.length - 4}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Poll */}
            {poll && (
              <PollBlock poll={poll} threadId={thread.id}
                onVoted={(updatedPoll) => setPoll(updatedPoll)} />
            )}

            {/* Action row */}
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
                  <span className="text-[13px]">{fmtN(replyCount)}</span>
                </Link>

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

        {/* Separator */}
        <div className="h-[1px] w-full bg-border" />

        {/* Close menus when clicking elsewhere */}
        {showMenu && (
          <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
        )}
      </div>

      {showDeleteConfirm && (
        <DeleteConfirmModal onConfirm={confirmDelete} onCancel={() => setShowDeleteConfirm(false)} />
      )}
    </>
  );
}
