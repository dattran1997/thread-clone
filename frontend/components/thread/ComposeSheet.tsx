"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Globe, Users, Lock, Image as ImageIcon, Mic, Hash, MapPin,
  X, Plus, ChevronLeft, Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/stores/auth";
import { useComposeStore } from "@/stores/compose";
import type { Thread } from "@/components/thread/PostCard";

// ─── Types ────────────────────────────────────────────────────────────────────
type ReplyPermission = "EVERYONE" | "FOLLOWING" | "MENTIONED";
type SubModal = "image" | "mic" | "hash" | "location" | null;
type View = "compose" | "who-can-reply";

interface TrendingHashtag { id: string; tag: string; threadCount: number; }

// ─── Character Ring SVG ───────────────────────────────────────────────────────
function CharRing({ count, max }: { count: number; max: number }) {
  const pct = Math.min((count / max) * 100, 100);
  const r = 10;
  const circ = 2 * Math.PI * r;
  const color = pct >= 100 ? "var(--color-destructive, #ef4444)" : pct >= 80 ? "#f59e0b" : "var(--color-foreground)";
  return (
    <svg className="-rotate-90" width={24} height={24} viewBox="0 0 24 24">
      <circle cx={12} cy={12} r={r} fill="none" stroke="var(--color-border)" strokeWidth={2} />
      <circle
        cx={12} cy={12} r={r} fill="none"
        stroke={color} strokeWidth={2}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct / 100)}
        className="transition-all duration-200"
      />
    </svg>
  );
}

// ─── Who Can Reply Sub-view ───────────────────────────────────────────────────
function WhoCanReplyView({
  value, onChange, onBack,
}: {
  value: ReplyPermission;
  onChange: (v: ReplyPermission) => void;
  onBack: () => void;
}) {
  const options: { v: ReplyPermission; label: string; Icon: React.ElementType }[] = [
    { v: "EVERYONE", label: "Anyone", Icon: Globe },
    { v: "FOLLOWING", label: "Profiles you follow", Icon: Users },
    { v: "MENTIONED", label: "Mentioned only", Icon: Lock },
  ];
  return (
    <div className="w-full max-w-[600px] rounded-2xl overflow-hidden bg-secondary border border-border shadow-2xl">
      <div className="flex items-center border-b border-border px-4 py-3">
        <button onClick={onBack} className="mr-3 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={20} />
        </button>
        <span className="font-semibold text-foreground flex-1 text-center pr-8">Who can reply</span>
      </div>
      <div className="p-2">
        {options.map(({ v, label, Icon }) => (
          <button
            key={v}
            onClick={() => { onChange(v); onBack(); }}
            className={cn(
              "w-full flex items-center justify-between p-4 rounded-xl transition-colors hover:bg-foreground/5",
              value === v && "bg-foreground/5",
            )}
          >
            <div className="flex items-center gap-3">
              <Icon size={22} className="text-foreground" />
              <span className="text-[15px] font-medium text-foreground">{label}</span>
            </div>
            {value === v && (
              <div className="h-5 w-5 rounded-full border-4 border-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Image Sub-modal ──────────────────────────────────────────────────────────
function ImageSubModal({ onClose }: { onClose: () => void }) {
  const placeholders = [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80",
    "https://images.unsplash.com/photo-1542442828-287217bfb87f?w=400&q=80",
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&q=80",
    "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=400&q=80",
    "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
  ];
  return (
    <div className="mt-2 mb-3 rounded-xl border border-border bg-secondary/60 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <span className="text-[13px] font-semibold text-foreground">Select Media</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5 p-2">
        {placeholders.map((url, i) => (
          <button key={i} onClick={onClose}
            className="aspect-square rounded-lg overflow-hidden border border-border hover:opacity-80 transition-opacity">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} className="w-full h-full object-cover" alt={`media ${i + 1}`} />
          </button>
        ))}
      </div>
      <p className="px-3 pb-2 text-[11px] text-muted-foreground">
        Media upload coming soon · up to 20 files, 10MB/image, 5-min video
      </p>
    </div>
  );
}

// ─── Hashtag Sub-modal ────────────────────────────────────────────────────────
function HashSubModal({
  onClose, onSelect,
}: {
  onClose: () => void;
  onSelect: (tag: string) => void;
}) {
  const [tags, setTags] = useState<TrendingHashtag[]>([]);

  useEffect(() => {
    api.get<TrendingHashtag[]>("/hashtags/trending?limit=8")
      .then(setTags)
      .catch(() => setTags([
        { id: "1", tag: "design", threadCount: 4200 },
        { id: "2", tag: "react", threadCount: 3800 },
        { id: "3", tag: "typescript", threadCount: 2900 },
        { id: "4", tag: "tailwind", threadCount: 2100 },
      ]));
  }, []);

  return (
    <div className="mt-2 mb-3 rounded-xl border border-border bg-secondary/60 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <span className="text-[13px] font-semibold text-foreground">Trending tags</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
      </div>
      <div className="flex flex-col max-h-[180px] overflow-y-auto">
        {tags.map((t) => (
          <button key={t.id}
            onClick={() => { onSelect(`#${t.tag}`); onClose(); }}
            className="flex items-center justify-between px-4 py-3 text-left hover:bg-foreground/5 transition-colors border-b border-border last:border-0">
            <span className="text-[14px] font-medium text-foreground">#{t.tag}</span>
            <span className="text-[12px] text-muted-foreground">
              {t.threadCount >= 1000 ? `${(t.threadCount / 1000).toFixed(1)}K` : t.threadCount} posts
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Location Sub-modal ───────────────────────────────────────────────────────
function LocationSubModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const locations = ["San Francisco, CA", "New York City, NY", "London, UK", "Tokyo, Japan", "Sydney, Australia"];
  const filtered = locations.filter((l) => l.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="mt-2 mb-3 rounded-xl border border-border bg-secondary/60 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <MapPin size={15} className="text-muted-foreground shrink-0" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search locations…"
          className="flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
      </div>
      <div className="flex flex-col max-h-[150px] overflow-y-auto">
        {filtered.map((loc) => (
          <button key={loc} onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 text-left hover:bg-foreground/5 transition-colors border-b border-border last:border-0">
            <MapPin size={14} className="text-muted-foreground shrink-0" />
            <span className="text-[14px] text-foreground">{loc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Mic Sub-modal ────────────────────────────────────────────────────────────
function MicSubModal({ onClose }: { onClose: () => void }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggle = () => {
    if (recording) {
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      setRecording(true);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="mt-2 mb-3 flex flex-col items-center gap-4 py-6 rounded-xl border border-border bg-secondary/60">
      <button
        onClick={toggle}
        className={cn(
          "h-16 w-16 rounded-full flex items-center justify-center transition-all",
          recording
            ? "bg-red-500 text-white animate-pulse"
            : "bg-primary text-primary-foreground",
        )}
      >
        {recording ? <Square size={24} fill="currentColor" /> : <Mic size={28} />}
      </button>
      <span className="font-mono text-[16px] text-foreground">{mm}:{ss}</span>
      <span className="text-[13px] text-muted-foreground">{recording ? "Tap to stop" : "Tap to record"}</span>
      {!recording && (
        <button onClick={onClose} className="text-[13px] text-muted-foreground hover:text-foreground">Cancel</button>
      )}
    </div>
  );
}

// ─── Main ComposeSheet ────────────────────────────────────────────────────────
export function ComposeSheet() {
  const { isOpen, parentId, close } = useComposeStore();
  const user = useAuthStore((s) => s.user);

  const [view, setView] = useState<View>("compose");
  const [text, setText] = useState("");
  const [replyPermission, setReplyPermission] = useState<ReplyPermission>("EVERYONE");
  const [subModal, setSubModal] = useState<SubModal>(null);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const MAX = 500;
  const remaining = MAX - text.length;

  // Reset state each time the sheet opens
  useEffect(() => {
    if (isOpen) {
      setText("");
      setView("compose");
      setSubModal(null);
      setReplyPermission("EVERYONE");
      setSubmitting(false);
      // Focus textarea after animation settles
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Auto-grow textarea
  const autoGrow = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  const handleInsertTag = (tag: string) => {
    const cursor = textareaRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, cursor);
    const after = text.slice(cursor);
    const space = before.length > 0 && !before.endsWith(" ") ? " " : "";
    const next = `${before}${space}${tag} ${after}`;
    setText(next);
    setTimeout(() => {
      const pos = before.length + space.length + tag.length + 1;
      textareaRef.current?.setSelectionRange(pos, pos);
      textareaRef.current?.focus();
      autoGrow();
    }, 0);
  };

  const handleSubmit = async () => {
    if (!text.trim() || submitting || !user) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { text: text.trim(), replyPermission };
      if (parentId) body.parentId = parentId;
      await api.post<Thread>("/threads", body);
      toast(parentId ? "Reply posted" : "Thread posted", "success");
      close();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to post", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) close();
  };

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, close]);

  if (!isOpen) return null;

  const replyLabel = replyPermission === "EVERYONE"
    ? "Anyone can reply & quote"
    : replyPermission === "FOLLOWING"
      ? "Profiles you follow can reply & quote"
      : "Mentioned only can reply & quote";

  const ReplyIcon = replyPermission === "EVERYONE" ? Globe : replyPermission === "FOLLOWING" ? Users : Lock;

  const canPost = text.trim().length > 0 && text.length <= MAX;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      {view === "who-can-reply" ? (
        <WhoCanReplyView
          value={replyPermission}
          onChange={setReplyPermission}
          onBack={() => setView("compose")}
        />
      ) : (
        <div className="w-full max-w-[600px] rounded-2xl overflow-hidden bg-secondary border border-border shadow-2xl flex flex-col max-h-[90vh]">
          {/* ── Header ── */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
            <button
              onClick={close}
              className="text-muted-foreground hover:text-foreground text-[15px] transition-colors"
            >
              Cancel
            </button>
            <span className="font-semibold text-foreground text-[15px]">
              {parentId ? "Reply" : "New thread"}
            </span>
            <button
              disabled={!canPost || submitting}
              onClick={handleSubmit}
              className={cn(
                "px-5 py-1.5 rounded-full text-[14px] font-semibold transition-all",
                canPost && !submitting
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-primary/40 text-primary-foreground/60 cursor-not-allowed",
              )}
            >
              {submitting ? "Posting…" : "Post"}
            </button>
          </div>

          {/* ── Body (scrollable) ── */}
          <div className="overflow-y-auto flex-1">
            <div className="flex gap-3 px-5 pt-5">
              {/* Left column: avatar + thread line */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <Avatar src={user?.avatarUrl} alt={user?.displayName ?? "You"} size={40} />
                <div className="w-[2px] grow rounded-full bg-border min-h-[24px]" />
              </div>

              {/* Right column: username + textarea + sub-modals */}
              <div className="flex flex-col flex-1 min-w-0 pb-4">
                <span className="font-semibold text-foreground text-[15px] mb-1.5">
                  {user?.username ?? "you"}
                </span>

                {/* Mic recorder replaces textarea; everything else stays in the else branch */}
                {subModal === "mic" ? (
                  <MicSubModal onClose={() => setSubModal(null)} />
                ) : (
                  <>
                    <textarea
                      ref={textareaRef}
                      value={text}
                      onChange={(e) => { setText(e.target.value); autoGrow(); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
                      }}
                      placeholder="What's new?"
                      rows={3}
                      className="w-full resize-none bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground outline-none leading-relaxed overflow-hidden"
                      style={{ minHeight: "60px" }}
                    />

                    {/* Inline sub-modals */}
                    {subModal === "image" && <ImageSubModal onClose={() => setSubModal(null)} />}
                    {subModal === "hash" && (
                      <HashSubModal
                        onClose={() => setSubModal(null)}
                        onSelect={handleInsertTag}
                      />
                    )}
                    {subModal === "location" && <LocationSubModal onClose={() => setSubModal(null)} />}

                    {/* Attachment toolbar */}
                    <div className="flex gap-4 mt-2 text-muted-foreground">
                      <button
                        onClick={() => setSubModal(subModal === "image" ? null : "image")}
                        title="Attach media"
                        className={cn("hover:text-foreground transition-colors", subModal === "image" && "text-primary")}
                      >
                        <ImageIcon size={20} />
                      </button>
                      <button
                        onClick={() => setSubModal("mic")}
                        title="Voice note"
                        className="hover:text-foreground transition-colors"
                      >
                        <Mic size={20} />
                      </button>
                      <button
                        onClick={() => setSubModal(subModal === "hash" ? null : "hash")}
                        title="Trending hashtags"
                        className={cn("hover:text-foreground transition-colors", subModal === "hash" && "text-primary")}
                      >
                        <Hash size={20} />
                      </button>
                      <button
                        onClick={() => setSubModal(subModal === "location" ? null : "location")}
                        title="Add location"
                        className={cn("hover:text-foreground transition-colors", subModal === "location" && "text-primary")}
                      >
                        <MapPin size={20} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Add to thread row */}
            <div className="flex items-center gap-3 px-5 pb-4 opacity-50">
              <Avatar src={user?.avatarUrl} alt="" size={24} />
              <span className="text-[14px] text-muted-foreground">Add to thread</span>
              <Plus size={14} className="text-muted-foreground" />
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-border shrink-0">
            {/* Who can reply */}
            <button
              onClick={() => setView("who-can-reply")}
              className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ReplyIcon size={15} />
              {replyLabel}
            </button>

            {/* Char ring + post button */}
            <div className="flex items-center gap-3">
              <CharRing count={text.length} max={MAX} />
              {remaining <= 0 && (
                <span className="text-[13px] font-medium text-red-500">{remaining}</span>
              )}
              <button
                disabled={!canPost || submitting}
                onClick={handleSubmit}
                className={cn(
                  "px-5 py-1.5 rounded-full text-[14px] font-semibold transition-all",
                  canPost && !submitting
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "bg-primary/40 text-primary-foreground/60 cursor-not-allowed",
                )}
              >
                {submitting ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
