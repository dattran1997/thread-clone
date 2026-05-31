"use client";
import { useState, useCallback } from "react";
import Link from "next/link";
import { cn, fmtN, relativeTime } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import { Avatar } from "@/components/ui/Avatar";
import {
  HeartIcon, ChatIcon, RepeatIcon, ShareIcon, BookmarkIcon,
  MoreIcon, EditIcon, TrashIcon, GhostIcon, PollIcon,
} from "@/components/ui/Icons";
import { useAuthStore } from "@/stores/auth";

// ─── Types (mirrors shared Thread shape) ──────────────────────────────────────
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
  id: string; url: string; type: "IMAGE" | "VIDEO";
  altText: string | null; order: number;
}

export interface Thread {
  id: string;
  author: Author;
  text: string;
  parentId: string | null;
  isGhost: boolean;
  isEdited: boolean;
  editableUntil: string | null;
  likeCount: number; replyCount: number; repostCount: number; quoteCount: number;
  media: Media[];
  poll: Poll | null;
  hashtags: string[];
  topics: string[];
  isLiked: boolean;
  isReposted: boolean;
  isSaved: boolean;
  createdAt: string;
}

interface PostCardProps {
  thread: Thread;
  onDelete?: (id: string) => void;
  showReplyLine?: boolean;
}

// ─── Poll component ────────────────────────────────────────────────────────────
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
          <button
            key={opt.id}
            onClick={() => vote(opt.id)}
            disabled={hasVoted || expired || !user}
            className={cn(
              "relative w-full rounded-xl border border-[var(--border)] overflow-hidden text-left",
              "transition-all hover:border-[var(--text2)] disabled:cursor-default",
              opt.id === poll.userVoteOptionId && "border-[var(--accent)]",
            )}
          >
            {/* Progress bar */}
            {(hasVoted || expired) && (
              <div
                className="absolute inset-y-0 left-0 bg-[var(--bg2)] transition-all"
                style={{ width: `${pct}%` }}
              />
            )}
            <div className="relative flex justify-between px-3 py-2.5 text-sm">
              <span className={cn("font-medium", opt.id === poll.userVoteOptionId && "text-[var(--accent)]")}>
                {opt.text}
              </span>
              {(hasVoted || expired) && (
                <span className="text-[var(--text2)]">{pct}%</span>
              )}
            </div>
          </button>
        );
      })}
      <p className="text-xs text-[var(--text2)]">
        {poll.totalVotes} votes · {expired ? "Closed" : `Closes ${relativeTime(poll.expiresAt)}`}
      </p>
    </div>
  );
}

// ─── Main PostCard ─────────────────────────────────────────────────────────────
export function PostCard({ thread, onDelete, showReplyLine = false }: PostCardProps) {
  const user = useAuthStore((s) => s.user);
  const [liked, setLiked] = useState(thread.isLiked);
  const [likeCount, setLikeCount] = useState(thread.likeCount);
  const [reposted, setReposted] = useState(thread.isReposted);
  const [repostCount, setRepostCount] = useState(thread.repostCount);
  const [saved, setSaved] = useState(thread.isSaved);
  const [showMenu, setShowMenu] = useState(false);
  const [poll, setPoll] = useState(thread.poll);
  const [heartBurst, setHeartBurst] = useState(false);

  const isOwn = user?.id === thread.author.id;

  // ── Like ──────────────────────────────────────────────────────────────────
  async function toggleLike() {
    if (!user) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => c + (newLiked ? 1 : -1));
    try {
      if (newLiked) await api.post(`/threads/${thread.id}/like`, {});
      else await api.delete(`/threads/${thread.id}/like`);
    } catch {
      setLiked(!newLiked);
      setLikeCount((c) => c + (newLiked ? -1 : 1));
    }
  }

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
    setReposted(newReposted);
    setRepostCount((c) => c + (newReposted ? 1 : -1));
    try {
      if (newReposted) {
        await api.post(`/threads/${thread.id}/repost`, {});
        toast("Reposted");
      } else {
        await api.delete(`/threads/${thread.id}/repost`);
        toast("Removed repost");
      }
    } catch {
      setReposted(!newReposted);
      setRepostCount((c) => c + (newReposted ? -1 : 1));
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function toggleSave() {
    if (!user) return;
    const newSaved = !saved;
    setSaved(newSaved);
    try {
      if (newSaved) { await api.post(`/threads/${thread.id}/save`, {}); toast("Saved"); }
      else { await api.delete(`/threads/${thread.id}/save`); toast("Removed from saved"); }
    } catch { setSaved(!newSaved); }
  }

  // ── Share ──────────────────────────────────────────────────────────────────
  function share() {
    const url = `${window.location.origin}/threads/${thread.id}`;
    navigator.clipboard.writeText(url).then(() => toast("Link copied"));
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete() {
    setShowMenu(false);
    if (!confirm("Delete this thread?")) return;
    try {
      await api.delete(`/threads/${thread.id}`);
      onDelete?.(thread.id);
      toast("Thread deleted");
    } catch { toast("Failed to delete", "error"); }
  }

  return (
    <article
      onDoubleClick={handleDoubleTap}
      className="relative flex gap-3 px-4 py-4 border-b border-[var(--border)] hover:bg-[var(--bg2)]/30 transition-colors cursor-default"
    >
      {/* Double-tap heart burst */}
      {heartBurst && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <HeartIcon size={80} className="text-red-500 animate-[heartPop_0.6s_ease_forwards]" />
        </div>
      )}

      {/* Avatar column */}
      <div className="flex flex-col items-center gap-1">
        <Link href={`/${thread.author.username}`}>
          <Avatar src={thread.author.avatarUrl} alt={thread.author.displayName} size={36} />
        </Link>
        {showReplyLine && <div className="flex-1 w-px bg-[var(--border)] mt-1" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Link href={`/${thread.author.username}`} className="font-semibold text-[var(--text)] text-sm hover:underline truncate">
              {thread.author.displayName}
            </Link>
            {thread.author.isVerified && (
              <svg width={14} height={14} viewBox="0 0 16 16" fill="#60a5fa"><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm3.78 5.22a.75.75 0 0 0-1.06 0L7 8.94 5.28 7.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.06 0l4.25-4.25a.75.75 0 0 0 0-1.06z" /></svg>
            )}
            {thread.isGhost && <GhostIcon size={14} className="text-[var(--text2)]" />}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs text-[var(--text2)]">{relativeTime(thread.createdAt)}</span>
            {thread.isEdited && <span className="text-xs text-[var(--text2)]">· edited</span>}
            {/* Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-[var(--text2)] hover:text-[var(--text)] rounded-full"
              >
                <MoreIcon size={18} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-7 z-20 bg-[var(--bg2)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden min-w-[140px]">
                  {isOwn && thread.editableUntil && new Date() < new Date(thread.editableUntil) && (
                    <Link
                      href={`/threads/${thread.id}/edit`}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-[var(--bg3)] text-[var(--text)]"
                    >
                      <EditIcon size={15} /> Edit
                    </Link>
                  )}
                  {isOwn && (
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-[var(--bg3)] text-red-500"
                    >
                      <TrashIcon size={15} /> Delete
                    </button>
                  )}
                  <button
                    onClick={() => { share(); setShowMenu(false); }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-[var(--bg3)] text-[var(--text)]"
                  >
                    <ShareIcon size={15} /> Share
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Username */}
        <Link href={`/${thread.author.username}`} className="text-xs text-[var(--text2)] hover:underline">
          @{thread.author.username}
        </Link>

        {/* Text */}
        <Link href={`/threads/${thread.id}`} className="block mt-1.5">
          <p className="text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap break-words">
            {thread.text}
          </p>
        </Link>

        {/* Media */}
        {thread.media.length > 0 && (
          <div className={cn("mt-2 gap-1", thread.media.length > 1 ? "grid grid-cols-2" : "flex")}>
            {thread.media.slice(0, 4).map((m) => (
              <div key={m.id} className="rounded-xl overflow-hidden aspect-square bg-[var(--bg3)]">
                {m.type === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.altText ?? ""} className="w-full h-full object-cover" />
                ) : (
                  <video src={m.url} className="w-full h-full object-cover" controls />
                )}
              </div>
            ))}
            {thread.media.length > 4 && (
              <div className="rounded-xl bg-[var(--bg3)] flex items-center justify-center text-sm text-[var(--text2)]">
                +{thread.media.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Poll */}
        {poll && (
          <PollBlock
            poll={poll}
            threadId={thread.id}
            onVoted={async () => {
              const updated = await api.get<Thread>(`/threads/${thread.id}`);
              setPoll(updated.poll);
            }}
          />
        )}

        {/* Hashtags */}
        {thread.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {thread.hashtags.map((tag) => (
              <Link key={tag} href={`/search?q=%23${tag}`} className="text-xs text-blue-400 hover:underline">
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center gap-4 mt-3">
          <button
            onClick={toggleLike}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-all",
              liked ? "text-red-500" : "text-[var(--text2)] hover:text-red-500",
            )}
            aria-label={liked ? "Unlike" : "Like"}
          >
            <HeartIcon
              size={18}
              fill={liked ? "currentColor" : "none"}
              className={liked ? "animate-[heartPop_0.3s_ease]" : ""}
            />
            <span>{fmtN(likeCount)}</span>
          </button>

          <Link
            href={`/threads/${thread.id}`}
            className="flex items-center gap-1.5 text-xs text-[var(--text2)] hover:text-[var(--text)] transition-colors"
          >
            <ChatIcon size={18} />
            <span>{fmtN(thread.replyCount)}</span>
          </Link>

          <button
            onClick={toggleRepost}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              reposted ? "text-green-500" : "text-[var(--text2)] hover:text-green-500",
            )}
          >
            <RepeatIcon size={18} />
            <span>{fmtN(repostCount)}</span>
          </button>

          <button
            onClick={toggleSave}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              saved ? "text-[var(--accent)]" : "text-[var(--text2)] hover:text-[var(--text)]",
            )}
          >
            <BookmarkIcon size={18} fill={saved ? "currentColor" : "none"} />
          </button>

          <button
            onClick={share}
            className="flex items-center gap-1.5 text-xs text-[var(--text2)] hover:text-[var(--text)] transition-colors ml-auto"
          >
            <ShareIcon size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
