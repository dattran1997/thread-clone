"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import { useAuthStore } from "@/stores/auth";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import { Image, List, Hash, Ghost, X, Loader2, Mic, MicOff } from "lucide-react";

const MAX_CHARS = 500;
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

interface MediaItem {
  localId: string;       // stable key for React
  file: File;
  previewUrl: string;
  serverId?: string;     // UUID returned by /media/upload
  uploading: boolean;
  error?: string;
}

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
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  if (!user) return null;

  const remaining = MAX_CHARS - text.length;
  const overLimit = remaining < 0;
  const ringPct = Math.min((text.length / MAX_CHARS) * 100, 100);
  const ringColor = remaining < 0 ? "var(--destructive)" : remaining < 50 ? "#f59e0b" : "var(--primary)";

  // ── Insert a character at the textarea cursor position ──────────────────────
  function insertAtCursor(char: string) {
    const el = textareaRef.current;
    if (!el) {
      setText((t) => t + char);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + char + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + char.length, start + char.length);
    });
  }

  // ── Upload a single file to the backend ────────────────────────────────────
  async function uploadFile(item: MediaItem) {
    // Read token the same way the api client does
    let token: string | null = null;
    try {
      const stored = localStorage.getItem("threads-auth");
      if (stored) token = JSON.parse(stored)?.state?.accessToken ?? null;
    } catch {}

    const form = new FormData();
    form.append("file", item.file);

    try {
      const res = await fetch(`${BASE}/media/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data: { id: string; url: string; type: string } = await res.json();
      setMediaItems((prev) =>
        prev.map((m) => m.localId === item.localId
          ? { ...m, serverId: data.id, uploading: false }
          : m,
        ),
      );
    } catch {
      setMediaItems((prev) =>
        prev.map((m) => m.localId === item.localId
          ? { ...m, uploading: false, error: "Upload failed" }
          : m,
        ),
      );
    }
  }

  // ── Handle file selection ──────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // reset so same file can be re-selected

    const available = 20 - mediaItems.length;
    if (available <= 0) { toast("Maximum 20 media items", "error"); return; }

    files.slice(0, available).forEach((file) => {
      const localId = crypto.randomUUID();
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

  // ── Voice recording ────────────────────────────────────────────────────────
  async function startRecording() {
    if (mediaItems.length >= 20) { toast("Maximum 20 media items", "error"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        const localId = crypto.randomUUID();
        const previewUrl = URL.createObjectURL(blob);
        const item: MediaItem = { localId, file, previewUrl, uploading: true };
        setMediaItems((prev) => [...prev, item]);
        uploadFile(item);
        // Clear timer
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setRecordingSeconds(0);
        setIsRecording(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      toast("Microphone access denied", "error");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handlePost() {
    if (overLimit || (!text.trim() && !showPoll && mediaItems.length === 0)) return;
    if (mediaItems.some((m) => m.uploading)) { toast("Please wait for uploads to finish", "error"); return; }

    setLoading(true);
    try {
      const mediaIds = mediaItems.filter((m) => m.serverId).map((m) => m.serverId!);
      const body: any = {
        text: text.trim(),
        ...(parentId ? { parentId } : {}),
        ...(isGhost && { isGhost: true }),
        ...(mediaIds.length > 0 && { mediaIds }),
        ...(showPoll && {
          poll: {
            options: pollOptions.filter((o) => o.trim()).map((o) => ({ text: o })),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
        }),
      };
      const thread = await api.post("/threads", body);

      // Clean up blob URLs
      mediaItems.forEach((m) => URL.revokeObjectURL(m.previewUrl));

      setText("");
      setIsGhost(false);
      setShowPoll(false);
      setPollOptions(["", ""]);
      setMediaItems([]);
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

  const anyUploading = mediaItems.some((m) => m.uploading);
  const canPost = !overLimit && !loading && !anyUploading &&
    (!!text.trim() || showPoll || mediaItems.length > 0);

  return (
    <div className="flex flex-col border-b border-border px-4 py-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex gap-4">
        <Avatar src={user.avatarUrl} alt={user.displayName} size={40} className="flex-shrink-0" />

        <div className="flex grow flex-col gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? (parentId ? "Reply to thread…" : "What's new?")}
            autoFocus={autoFocus}
            rows={parentId ? 2 : 1}
            className="w-full resize-none bg-transparent py-1 text-[15px] text-foreground placeholder:text-muted-foreground outline-none leading-relaxed"
          />

          {/* Media previews */}
          {mediaItems.length > 0 && (
            <div className="flex flex-col gap-2">
              {/* Audio previews — horizontal strip */}
              {mediaItems.filter((m) => m.file.type.startsWith("audio/")).map((m) => (
                <div key={m.localId} className="relative flex items-center gap-2 rounded-xl bg-secondary border border-border px-3 py-2">
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
              {/* Image/video previews */}
              <div className="flex flex-wrap gap-2">
                {mediaItems.filter((m) => !m.file.type.startsWith("audio/")).map((m) => (
                  <div key={m.localId} className="relative w-20 h-20 rounded-xl overflow-hidden bg-secondary border border-border flex-shrink-0">
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

          {/* Poll block */}
          {showPoll && (
            <div className="border border-border rounded-xl bg-secondary/50 p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[13px] font-medium text-foreground">Create a Poll</span>
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
                    className="bg-transparent border-none outline-none text-[14px] text-foreground placeholder:text-muted-foreground grow"
                  />
                  {pollOptions.length > 2 && (
                    <button onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 4 && (
                <button onClick={() => setPollOptions([...pollOptions, ""])}
                  className="flex items-center gap-2 text-[14px] text-muted-foreground hover:text-foreground transition-colors">
                  + Add an option
                </button>
              )}
            </div>
          )}

          {/* Ghost mode indicator */}
          {isGhost && (
            <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Ghost size={12} />
              Ghost post · disappears in 24 hours
            </p>
          )}

          {/* Toolbar */}
          <div className="flex items-center gap-4 text-muted-foreground/80 pt-1">
            {/* Image / Video / Audio file */}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Add photo, video or audio"
              className={cn(
                "hover:text-foreground transition-colors",
                mediaItems.length > 0 && "text-primary",
              )}
            >
              <Image size={20} />
            </button>

            {/* Microphone — record voice */}
            <button
              onClick={() => (isRecording ? stopRecording() : startRecording())}
              title={isRecording ? "Stop recording" : "Record voice"}
              className={cn(
                "hover:text-foreground transition-colors flex items-center gap-1",
                isRecording && "text-destructive animate-pulse",
              )}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
              {isRecording && (
                <span className="text-[11px] font-mono tabular-nums">
                  {String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:
                  {String(recordingSeconds % 60).padStart(2, "0")}
                </span>
              )}
            </button>

            {/* Poll */}
            <button
              onClick={() => { setShowPoll(!showPoll); }}
              title="Create a poll"
              className={cn("hover:text-foreground transition-colors", showPoll && "text-primary")}
            >
              <List size={20} />
            </button>

            {/* Hashtag — inserts # at cursor */}
            <button
              onClick={() => insertAtCursor("#")}
              title="Add hashtag"
              className="hover:text-foreground transition-colors"
            >
              <Hash size={20} />
            </button>

            {/* Ghost post */}
            <button
              onClick={() => setIsGhost(!isGhost)}
              title="Ghost post (disappears in 24h)"
              className={cn("hover:text-foreground transition-colors", isGhost && "text-primary")}
            >
              <Ghost size={20} />
            </button>
          </div>
        </div>

        {/* Post button + char ring — right-aligned */}
        <div className="flex flex-col items-end justify-between">
          {/* Char ring */}
          {text.length > 0 && (
            <div className="relative w-6 h-6 flex items-center justify-center mt-2">
              <svg width={24} height={24} className="-rotate-90">
                <circle cx={12} cy={12} r={9} fill="none" stroke="var(--muted)" strokeWidth={2.5} />
                <circle
                  cx={12} cy={12} r={9} fill="none"
                  stroke={ringColor} strokeWidth={2.5}
                  strokeDasharray={56.5}
                  strokeDashoffset={56.5 * (1 - ringPct / 100)}
                  strokeLinecap="round"
                />
              </svg>
              {remaining <= 20 && (
                <span className="absolute text-[8px] font-bold" style={{ color: ringColor }}>
                  {remaining}
                </span>
              )}
            </div>
          )}

          <button
            onClick={handlePost}
            disabled={!canPost}
            className={cn(
              "px-4 py-1 h-8 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold transition-opacity",
              !canPost ? "opacity-50 cursor-not-allowed" : "hover:opacity-90",
            )}
          >
            {loading ? "Posting…" : anyUploading ? "Uploading…" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
