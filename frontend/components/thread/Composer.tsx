"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import { useAuthStore } from "@/stores/auth";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import { ImgIcon, PollIcon, GhostIcon, CloseIcon } from "@/components/ui/Icons";

const MAX_CHARS = 500;

interface ComposerProps {
  parentId?: string;
  onSuccess?: (thread: any) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function Composer({ parentId, onSuccess, placeholder, autoFocus = false }: ComposerProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [text, setText] = useState("");
  const [isGhost, setIsGhost] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!user) return null;

  const remaining = MAX_CHARS - text.length;
  const overLimit = remaining < 0;
  const ringPct = Math.min((text.length / MAX_CHARS) * 100, 100);
  const ringColor = remaining < 0 ? "#ef4444" : remaining < 50 ? "#f59e0b" : "var(--accent)";

  async function handlePost() {
    if (overLimit || (!text.trim() && !showPoll)) return;
    setLoading(true);
    try {
      const body: any = {
        text: text.trim(),
        ...(parentId && { parentId }),
        ...(isGhost && { isGhost: true }),
        ...(showPoll && {
          poll: {
            options: pollOptions.filter((o) => o.trim()).map((o) => ({ text: o })),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
        }),
      };
      const thread = await api.post("/threads", body);
      setText("");
      setIsGhost(false);
      setShowPoll(false);
      setPollOptions(["", ""]);
      toast(parentId ? "Reply posted" : "Thread posted");
      onSuccess?.(thread);
      if (!parentId) router.push("/");
    } catch (err: any) {
      toast(err?.message ?? "Failed to post", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePost();
  }

  return (
    <div className="flex gap-3 p-4">
      {/* Avatar */}
      <Avatar src={user.avatarUrl} alt={user.displayName} size={36} className="flex-shrink-0" />

      {/* Input area */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-[var(--text)] mb-1">
          {user.username}
        </div>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? (parentId ? "Reply to thread…" : "What's on your mind?")}
          autoFocus={autoFocus}
          rows={3}
          className={cn(
            "w-full bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text3)]",
            "resize-none outline-none leading-relaxed",
          )}
        />

        {/* Poll */}
        {showPoll && (
          <div className="mt-2 space-y-2 p-3 rounded-xl border border-[var(--border)]">
            <p className="text-xs font-semibold text-[var(--text2)]">Poll options (closes in 24h)</p>
            {pollOptions.map((opt, i) => (
              <input
                key={i}
                value={opt}
                onChange={(e) => {
                  const next = [...pollOptions];
                  next[i] = e.target.value;
                  setPollOptions(next);
                }}
                placeholder={`Option ${i + 1}`}
                maxLength={25}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg3)] text-sm text-[var(--text)] placeholder:text-[var(--text3)] outline-none"
              />
            ))}
            {pollOptions.length < 4 && (
              <button
                onClick={() => setPollOptions([...pollOptions, ""])}
                className="text-xs text-[var(--accent)] hover:underline"
              >
                + Add option
              </button>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => toast("Media upload coming in M11")}
              className="p-1.5 text-[var(--text2)] hover:text-[var(--text)] rounded-full hover:bg-[var(--bg3)] transition-colors"
            >
              <ImgIcon size={18} />
            </button>
            <button
              onClick={() => setShowPoll(!showPoll)}
              className={cn(
                "p-1.5 rounded-full hover:bg-[var(--bg3)] transition-colors",
                showPoll ? "text-[var(--accent)]" : "text-[var(--text2)] hover:text-[var(--text)]",
              )}
            >
              <PollIcon size={18} />
            </button>
            <button
              onClick={() => setIsGhost(!isGhost)}
              className={cn(
                "p-1.5 rounded-full hover:bg-[var(--bg3)] transition-colors",
                isGhost ? "text-[var(--accent)]" : "text-[var(--text2)] hover:text-[var(--text)]",
              )}
              title="Ghost post (disappears in 24h)"
            >
              <GhostIcon size={18} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Char ring */}
            {text.length > 0 && (
              <div className="relative w-7 h-7 flex items-center justify-center">
                <svg width={28} height={28} className="-rotate-90">
                  <circle cx={14} cy={14} r={11} fill="none" stroke="var(--bg3)" strokeWidth={2.5} />
                  <circle
                    cx={14} cy={14} r={11} fill="none"
                    stroke={ringColor} strokeWidth={2.5}
                    strokeDasharray={69.1}
                    strokeDashoffset={69.1 * (1 - ringPct / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                {remaining <= 20 && (
                  <span className="absolute text-[9px] font-bold" style={{ color: ringColor }}>
                    {remaining}
                  </span>
                )}
              </div>
            )}

            <button
              onClick={handlePost}
              disabled={overLimit || loading || (!text.trim() && !showPoll)}
              className="px-4 py-1.5 rounded-full bg-[var(--accent)] text-[var(--accent-text)] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {loading ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
