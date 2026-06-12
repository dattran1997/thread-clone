"use client";
import { useState, useRef, useEffect } from "react";
import {
  Globe, Users, Lock,
  Image as ImageIcon, Mic, MicOff, Hash, Ghost, List,
  X, Plus, Loader2, ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/stores/auth";
import { useComposeStore } from "@/stores/compose";

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX = 500;

// ─── Types ────────────────────────────────────────────────────────────────────
type ReplyPermission = "EVERYONE" | "FOLLOWING" | "MENTIONED";
interface MediaItem {
  localId: string;
  file: File;
  previewUrl: string;
  serverId?: string;
  uploading: boolean;
  error?: string;
}
interface TrendingHashtag { id: string; tag: string; threadCount: number; }

// ─── Character ring ───────────────────────────────────────────────────────────
function CharRing({ count }: { count: number }) {
  const pct      = Math.min((count / MAX) * 100, 100);
  const r        = 10;
  const circ     = 2 * Math.PI * r;
  const remaining = MAX - count;
  const color    = remaining < 0 ? "var(--color-destructive,#ef4444)" : remaining < 50 ? "#f59e0b" : "var(--color-foreground)";
  return (
    <div className="relative flex items-center justify-center w-6 h-6">
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
      {remaining <= 20 && (
        <span className="absolute text-[8px] font-bold" style={{ color }}>{remaining}</span>
      )}
    </div>
  );
}

// ─── Who-can-reply sub-view ───────────────────────────────────────────────────
function WhoCanReplyView({ value, onChange, onBack }: {
  value: ReplyPermission;
  onChange: (v: ReplyPermission) => void;
  onBack: () => void;
}) {
  const options: { v: ReplyPermission; label: string; sub: string; Icon: React.ElementType }[] = [
    { v: "EVERYONE",  label: "Anyone",              sub: "Anyone on Threads",   Icon: Globe },
    { v: "FOLLOWING", label: "Profiles you follow", sub: "People you follow",   Icon: Users },
    { v: "MENTIONED", label: "Mentioned only",      sub: "Only mentioned users", Icon: Lock  },
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
        {options.map(({ v, label, sub, Icon }) => (
          <button key={v} onClick={() => { onChange(v); onBack(); }}
            className={cn(
              "w-full flex items-center justify-between p-4 rounded-xl transition-colors hover:bg-foreground/5",
              value === v && "bg-foreground/5",
            )}
          >
            <div className="flex items-center gap-3">
              <Icon size={22} className="text-foreground" />
              <div className="text-left">
                <p className="text-[15px] font-medium text-foreground">{label}</p>
                <p className="text-[12px] text-muted-foreground">{sub}</p>
              </div>
            </div>
            <div className={cn(
              "h-5 w-5 rounded-full border-2 transition-colors",
              value === v ? "border-4 border-primary" : "border-border",
            )} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Trending hashtag picker ──────────────────────────────────────────────────
function HashPicker({ onSelect, onClose }: { onSelect: (tag: string) => void; onClose: () => void }) {
  const [tags, setTags] = useState<TrendingHashtag[]>([]);
  useEffect(() => {
    api.get<TrendingHashtag[]>("/hashtags/trending?limit=8")
      .then(setTags)
      .catch(() => setTags([
        { id: "1", tag: "design",     threadCount: 4200 },
        { id: "2", tag: "react",      threadCount: 3800 },
        { id: "3", tag: "typescript", threadCount: 2900 },
        { id: "4", tag: "tailwind",   threadCount: 2100 },
      ]));
  }, []);

  return (
    <div className="mt-2 rounded-xl border border-border bg-secondary/60 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <span className="text-[13px] font-semibold text-foreground">Trending hashtags</span>
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

// ─── Main ComposeSheet ────────────────────────────────────────────────────────
export function ComposeSheet() {
  const { isOpen, parentId, close } = useComposeStore();
  const user = useAuthStore((s) => s.user);

  // ── Compose state (mirrors Composer.tsx) ────────────────────────────────────
  const [text,          setText]          = useState("");
  const [isGhost,       setIsGhost]       = useState(false);
  const [showPoll,      setShowPoll]      = useState(false);
  const [pollOptions,   setPollOptions]   = useState(["", ""]);
  const [mediaItems,    setMediaItems]    = useState<MediaItem[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [replyPerm,     setReplyPerm]     = useState<ReplyPermission>("EVERYONE");
  const [isRecording,   setIsRecording]   = useState(false);
  const [recSeconds,    setRecSeconds]    = useState(0);
  const [showHashPicker,setShowHashPicker]= useState(false);

  // ── Routing between compose ↔ who-can-reply ──────────────────────────────
  const [view, setView] = useState<"compose" | "who-can-reply">("compose");

  // ── Refs ─────────────────────────────────────────────────────────────────
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const recorderRef    = useRef<MediaRecorder | null>(null);
  const recTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Reset everything each time the sheet opens ───────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setText(""); setIsGhost(false); setShowPoll(false); setPollOptions(["", ""]);
    setMediaItems([]); setLoading(false); setReplyPerm("EVERYONE");
    setIsRecording(false); setRecSeconds(0); setShowHashPicker(false); setView("compose");
    setTimeout(() => textareaRef.current?.focus(), 80);
  }, [isOpen]);

  // ── Auto-grow textarea ────────────────────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  // ── Close on Escape ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, close]);

  // ── File upload ───────────────────────────────────────────────────────────
  async function uploadFile(item: MediaItem) {
    const form = new FormData();
    form.append("file", item.file);
    try {
      const data = await api.upload<{ id: string; url: string; type: string }>("/media/upload", form);
      setMediaItems((prev) =>
        prev.map((m) => m.localId === item.localId ? { ...m, serverId: data.id, uploading: false } : m),
      );
    } catch {
      setMediaItems((prev) =>
        prev.map((m) => m.localId === item.localId ? { ...m, uploading: false, error: "Upload failed" } : m),
      );
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const available = 20 - mediaItems.length;
    if (available <= 0) { toast("Maximum 20 media items", "error"); return; }
    files.slice(0, available).forEach((file) => {
      const localId    = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      const item: MediaItem = { localId, file, previewUrl, uploading: true };
      setMediaItems((prev) => [...prev, item]);
      uploadFile(item);
    });
  }

  function removeMedia(localId: string) {
    setMediaItems((prev) => {
      const target = prev.find((m) => m.localId === localId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((m) => m.localId !== localId);
    });
  }

  // ── Voice recording ───────────────────────────────────────────────────────
  async function startRecording() {
    if (mediaItems.length >= 20) { toast("Maximum 20 media items", "error"); return; }
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob  = new Blob(chunks, { type: "audio/webm" });
        const file  = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        const localId    = crypto.randomUUID();
        const previewUrl = URL.createObjectURL(blob);
        const item: MediaItem = { localId, file, previewUrl, uploading: true };
        setMediaItems((prev) => [...prev, item]);
        uploadFile(item);
        if (recTimerRef.current) clearInterval(recTimerRef.current);
        setRecSeconds(0);
        setIsRecording(false);
      };
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch {
      toast("Microphone access denied", "error");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  // ── Insert text at cursor ─────────────────────────────────────────────────
  function insertAtCursor(str: string) {
    const el    = textareaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end   = el?.selectionEnd   ?? text.length;
    const space = start > 0 && text[start - 1] !== " " ? " " : "";
    const next  = text.slice(0, start) + space + str + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + space.length + str.length;
      el?.setSelectionRange(pos, pos);
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handlePost() {
    const overLimit   = text.length > MAX;
    const hasContent  = !!text.trim() || showPoll || mediaItems.length > 0;
    const anyUploading = mediaItems.some((m) => m.uploading);
    if (overLimit || !hasContent || loading) return;
    if (anyUploading) { toast("Please wait for uploads to finish", "error"); return; }

    setLoading(true);
    try {
      const mediaIds = mediaItems.filter((m) => m.serverId).map((m) => m.serverId!);
      const body: Record<string, unknown> = {
        text: text.trim(),
        replyPermission: replyPerm,
        ...(parentId              && { parentId }),
        ...(isGhost               && { isGhost: true }),
        ...(mediaIds.length > 0   && { mediaIds }),
        ...(showPoll && {
          poll: {
            options:   pollOptions.filter((o) => o.trim()).map((o) => ({ text: o })),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
        }),
      };
      const thread = await api.post("/threads", body);

      // Let the home feed know a new thread was composed (home page listens for this)
      if (!parentId) {
        window.dispatchEvent(new CustomEvent("thread-composed", { detail: thread }));
      }

      mediaItems.forEach((m) => URL.revokeObjectURL(m.previewUrl));
      toast(parentId ? "Reply posted" : "Thread posted");
      close();
    } catch (err: any) {
      toast(err?.message ?? "Failed to post", "error");
    } finally {
      setLoading(false);
    }
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const remaining   = MAX - text.length;
  const overLimit   = remaining < 0;
  const anyUploading = mediaItems.some((m) => m.uploading);
  const canPost     = !overLimit && !loading && !anyUploading &&
    (!!text.trim() || showPoll || mediaItems.length > 0);

  const replyLabel = replyPerm === "EVERYONE"
    ? "Anyone can reply & quote"
    : replyPerm === "FOLLOWING"
      ? "Profiles you follow can reply"
      : "Mentioned only can reply";

  const ReplyIcon = replyPerm === "EVERYONE" ? Globe : replyPerm === "FOLLOWING" ? Users : Lock;

  if (!isOpen || !user) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      {/* ── Who-can-reply sub-view ── */}
      {view === "who-can-reply" ? (
        <WhoCanReplyView value={replyPerm} onChange={setReplyPerm} onBack={() => setView("compose")} />
      ) : (
        <div className="w-full max-w-[600px] rounded-2xl overflow-hidden bg-secondary border border-border shadow-2xl flex flex-col max-h-[90vh]">

          {/* ── Header ── */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
            <button onClick={close} className="text-[15px] text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <span className="font-semibold text-foreground text-[15px]">
              {parentId ? "Reply" : "New thread"}
            </span>
            <button
              onClick={handlePost}
              disabled={!canPost}
              className={cn(
                "px-5 py-1.5 rounded-full text-[14px] font-semibold transition-all",
                canPost
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-primary/40 text-primary-foreground/60 cursor-not-allowed",
              )}
            >
              {loading ? "Posting…" : anyUploading ? "Uploading…" : "Post"}
            </button>
          </div>

          {/* ── Scrollable body ── */}
          <div className="overflow-y-auto flex-1 px-5 pt-5 pb-2">

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="flex gap-3">
              {/* Avatar column with thread line */}
              <div className="flex flex-col items-center shrink-0">
                <Avatar src={user.avatarUrl} alt={user.displayName} size={40} />
                <div className="mt-2 w-[2px] grow rounded-full bg-border min-h-[24px]" />
              </div>

              {/* Content column */}
              <div className="flex flex-col flex-1 min-w-0 pb-2">
                <span className="font-semibold text-foreground text-[15px] mb-1.5">
                  {user.username}
                </span>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => { if (e.target.value.length <= MAX) setText(e.target.value); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePost(); }}
                  placeholder={parentId ? `Reply to thread…` : "What's new?"}
                  rows={3}
                  style={{ minHeight: "60px", overflow: "hidden" }}
                  className="w-full resize-none bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground outline-none leading-relaxed"
                />

                {/* Media previews */}
                {mediaItems.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2">
                    {/* Audio */}
                    {mediaItems.filter((m) => m.file.type.startsWith("audio/")).map((m) => (
                      <div key={m.localId} className="relative flex items-center gap-2 rounded-xl bg-background border border-border px-3 py-2">
                        {m.uploading ? (
                          <div className="flex items-center gap-2 text-muted-foreground text-[13px]">
                            <Loader2 size={14} className="animate-spin" />
                            <span>Uploading audio…</span>
                          </div>
                        ) : m.error ? (
                          <span className="text-[12px] text-destructive">{m.error}</span>
                        ) : (
                          <audio src={m.previewUrl} controls className="h-8 w-full" />
                        )}
                        <button onClick={() => removeMedia(m.localId)}
                          className="flex-shrink-0 w-5 h-5 rounded-full bg-foreground/10 text-foreground flex items-center justify-center hover:bg-foreground/20 transition-colors">
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    {/* Image / video grid */}
                    <div className="flex flex-wrap gap-2">
                      {mediaItems.filter((m) => !m.file.type.startsWith("audio/")).map((m) => (
                        <div key={m.localId} className="relative w-20 h-20 rounded-xl overflow-hidden bg-muted border border-border flex-shrink-0">
                          {m.file.type.startsWith("image/") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.previewUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <video src={m.previewUrl} className="w-full h-full object-cover" muted />
                          )}
                          {m.uploading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <Loader2 size={20} className="text-white animate-spin" />
                            </div>
                          )}
                          {m.error && (
                            <div className="absolute inset-0 bg-destructive/60 flex items-center justify-center">
                              <span className="text-[9px] text-white font-bold text-center px-1">{m.error}</span>
                            </div>
                          )}
                          <button onClick={() => removeMedia(m.localId)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors">
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Poll builder */}
                {showPoll && (
                  <div className="mt-3 border border-border rounded-xl bg-background/50 p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] font-semibold text-foreground">Poll</span>
                      <button onClick={() => setShowPoll(false)} className="text-muted-foreground hover:text-foreground">
                        <X size={16} />
                      </button>
                    </div>
                    {pollOptions.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border border-border bg-background shrink-0" />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const next = [...pollOptions];
                            next[i] = e.target.value;
                            setPollOptions(next);
                          }}
                          placeholder={`Option ${i + 1}`}
                          maxLength={25}
                          className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground outline-none border-b border-border/50 pb-0.5 focus:border-primary transition-colors"
                        />
                        {pollOptions.length > 2 && (
                          <button onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}
                            className="text-muted-foreground hover:text-destructive transition-colors">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                    {pollOptions.length < 4 && (
                      <button onClick={() => setPollOptions([...pollOptions, ""])}
                        className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
                        <Plus size={14} />
                        Add option
                      </button>
                    )}
                    <p className="text-[11px] text-muted-foreground">Poll closes in 24 hours</p>
                  </div>
                )}

                {/* Hashtag picker */}
                {showHashPicker && (
                  <div className="mt-2">
                    <HashPicker
                      onSelect={insertAtCursor}
                      onClose={() => setShowHashPicker(false)}
                    />
                  </div>
                )}

                {/* Ghost indicator */}
                {isGhost && (
                  <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground mt-2">
                    <Ghost size={12} />
                    Ghost post · disappears in 24 hours
                  </p>
                )}

                {/* Toolbar */}
                <div className="flex items-center gap-4 text-muted-foreground/80 mt-3">
                  {/* Image / video */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    title="Add photo, video or audio"
                    className={cn("hover:text-foreground transition-colors", mediaItems.length > 0 && "text-primary")}
                  >
                    <ImageIcon size={20} />
                  </button>

                  {/* Voice recording */}
                  <button
                    onClick={() => isRecording ? stopRecording() : startRecording()}
                    title={isRecording ? "Stop recording" : "Record voice"}
                    className={cn(
                      "hover:text-foreground transition-colors flex items-center gap-1",
                      isRecording && "text-destructive animate-pulse",
                    )}
                  >
                    {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                    {isRecording && (
                      <span className="text-[11px] font-mono tabular-nums">
                        {String(Math.floor(recSeconds / 60)).padStart(2, "0")}:{String(recSeconds % 60).padStart(2, "0")}
                      </span>
                    )}
                  </button>

                  {/* Poll */}
                  <button
                    onClick={() => setShowPoll((v) => !v)}
                    title="Create a poll"
                    className={cn("hover:text-foreground transition-colors", showPoll && "text-primary")}
                  >
                    <List size={20} />
                  </button>

                  {/* Hashtag */}
                  <button
                    onClick={() => setShowHashPicker((v) => !v)}
                    title="Trending hashtags"
                    className={cn("hover:text-foreground transition-colors", showHashPicker && "text-primary")}
                  >
                    <Hash size={20} />
                  </button>

                  {/* Ghost post */}
                  <button
                    onClick={() => setIsGhost((v) => !v)}
                    title="Ghost post (disappears in 24 h)"
                    className={cn("hover:text-foreground transition-colors", isGhost && "text-primary")}
                  >
                    <Ghost size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Add to thread row */}
            <div className="flex items-center gap-3 pb-2 mt-2 opacity-40">
              <Avatar src={user.avatarUrl} alt="" size={24} />
              <span className="text-[14px] text-muted-foreground">Add to thread</span>
              <Plus size={14} className="text-muted-foreground" />
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-border shrink-0">
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
              {text.length > 0 && <CharRing count={text.length} />}
              <button
                onClick={handlePost}
                disabled={!canPost}
                className={cn(
                  "px-5 py-1.5 rounded-full text-[14px] font-semibold transition-all",
                  canPost
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "bg-primary/40 text-primary-foreground/60 cursor-not-allowed",
                )}
              >
                {loading ? "Posting…" : anyUploading ? "Uploading…" : "Post"}
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
