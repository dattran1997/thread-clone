"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import { useAuthStore } from "@/stores/auth";
import { DesktopSidebar } from "@/components/shell/DesktopSidebar";
import { MobileNav } from "@/components/shell/MobileNav";
import { ChevronLeft, Clock, ImagePlus, Mic, MicOff, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Thread, Media } from "@/components/thread/PostCard";

const MAX_CHARS = 500;

export default function EditThreadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [thread, setThread] = useState<Thread | null>(null);
  const [text, setText] = useState("");
  const [media, setMedia] = useState<Media[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  useEffect(() => {
    api.get<Thread>(`/threads/${id}`)
      .then((t) => {
        if (t.author.id !== user?.id) { router.replace("/"); return; }
        if (!t.editableUntil || new Date() > new Date(t.editableUntil)) {
          toast("Edit window has closed (15 minutes max)", "error");
          router.replace(`/threads/${id}`);
          return;
        }
        setThread(t);
        setText(t.text);
        setMedia(t.media ?? []);
        const ms = new Date(t.editableUntil).getTime() - Date.now();
        setMinutesLeft(Math.max(0, Math.ceil(ms / 60000)));
      })
      .catch(() => router.replace("/"))
      .finally(() => setLoading(false));
  }, [id, user, router]);

  // Countdown timer
  useEffect(() => {
    if (minutesLeft === null) return;
    const interval = setInterval(() => {
      if (!thread?.editableUntil) return;
      const ms = new Date(thread.editableUntil).getTime() - Date.now();
      const m = Math.max(0, Math.ceil(ms / 60000));
      setMinutesLeft(m);
      if (m === 0) { clearInterval(interval); toast("Edit window closed", "error"); router.replace(`/threads/${id}`); }
    }, 30_000);
    return () => clearInterval(interval);
  }, [thread, id, router, minutesLeft]);

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.upload<{ id: string; url: string | null; type: string; status: string; hlsUrl: string | null; duration: number | null }>("/media/upload", form);
      const newMedia: Media = { id: res.id, url: res.url, hlsUrl: res.hlsUrl, type: res.type as Media["type"], altText: null, order: 0, duration: res.duration, status: (res.status as Media["status"]) ?? "READY" };
      setMedia((prev) => [...prev, newMedia]);
    } catch { toast("Upload failed", "error"); }
    finally { setUploading(false); }
  }

  function removeMedia(mediaId: string) {
    setMedia((prev) => prev.filter((m) => m.id !== mediaId));
  }

  // ── Voice recording ──────────────────────────────────────────────────────────
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setRecordingSeconds(0);
        setIsRecording(false);
        // Upload and add to media list
        uploadFile(file);
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

  async function handleSave() {
    if (text.length > MAX_CHARS || saving) return;
    setSaving(true);
    try {
      await api.patch(`/threads/${id}`, {
        text: text.trim(),
        mediaIds: media.map((m) => m.id),
      });
      toast("Thread updated");
      router.replace(`/threads/${id}`);
    } catch (err: any) {
      toast(err?.message ?? "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  const remaining = MAX_CHARS - text.length;
  const overLimit = remaining < 0;

  const visuals = media.filter((m) => m.type === "IMAGE" || m.type === "VIDEO");
  const audio = media.filter((m) => m.type === "AUDIO");

  return (
    <div className="flex min-h-screen w-full justify-center bg-background text-foreground">
      <div className="hidden md:flex flex-col h-screen sticky top-0 border-r border-border w-[252px] flex-shrink-0">
        <DesktopSidebar />
      </div>

      <main className="w-full max-w-[622px] border-r border-border min-h-screen pb-14 md:pb-0">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-4 bg-background/90 backdrop-blur-xl border-b border-border">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="rounded-full p-2 text-foreground hover:bg-foreground/10 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="font-semibold text-foreground">Edit thread</span>
          </div>
          <button
            onClick={handleSave}
            disabled={overLimit || saving || uploading}
            className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-[14px] font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            <div className="h-4 bg-secondary rounded animate-pulse w-3/4" />
            <div className="h-4 bg-secondary rounded animate-pulse w-1/2" />
          </div>
        ) : thread ? (
          <div className="px-6 py-6 space-y-4">
            {/* Edit window notice */}
            {minutesLeft !== null && minutesLeft > 0 && (
              <div className="flex items-center gap-2 text-[13px] text-amber-500">
                <Clock size={14} />
                <span>Edit window closes in ~{minutesLeft} minute{minutesLeft !== 1 ? "s" : ""}</span>
              </div>
            )}

            {/* Text */}
            <div className="flex flex-col gap-2">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoFocus
                rows={5}
                className="w-full resize-none bg-secondary rounded-xl p-4 text-[15px] text-foreground placeholder:text-muted-foreground outline-none leading-relaxed focus:ring-1 focus:ring-primary transition-all"
                placeholder="What's on your mind?"
              />
              <div className="flex justify-end">
                <span className={cn("text-[13px] font-medium", overLimit ? "text-destructive" : remaining < 50 ? "text-amber-500" : "text-muted-foreground")}>
                  {remaining}
                </span>
              </div>
            </div>

            {/* Image / Video previews */}
            {visuals.length > 0 && (
              <div className={cn("gap-2", visuals.length === 1 ? "block" : "grid grid-cols-2")}>
                {visuals.map((m) => (
                  <div key={m.id} className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-border bg-muted">
                    {m.type === "IMAGE"
                      ? <img src={m.url ?? undefined} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      : <video src={m.url ?? undefined} className="absolute inset-0 w-full h-full object-cover" />}
                    <button
                      onClick={() => removeMedia(m.id)}
                      className="absolute top-1.5 right-1.5 bg-black/60 rounded-full p-1 text-white hover:bg-black/80 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Audio clips */}
            {audio.map((m) => (
              <div key={m.id} className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3 border border-border">
                <Mic size={16} className="text-muted-foreground shrink-0" />
                <audio src={m.url ?? undefined} controls className="flex-1 h-8" />
                <button onClick={() => removeMedia(m.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <X size={16} />
                </button>
              </div>
            ))}

            {/* Toolbar */}
            <div className="flex items-center gap-4 pt-2 border-t border-border">
              <input ref={imageInputRef} type="file" accept="image/*,video/*" multiple className="hidden"
                onChange={(e) => { Array.from(e.target.files ?? []).forEach(uploadFile); e.target.value = ""; }} />

              {/* Add photo / video */}
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                Add photo / video
              </button>

              {/* Voice recorder — tap to start, tap again to stop */}
              <button
                onClick={() => isRecording ? stopRecording() : startRecording()}
                disabled={uploading}
                className={cn(
                  "flex items-center gap-1.5 text-[13px] transition-colors disabled:opacity-40",
                  isRecording
                    ? "text-destructive animate-pulse"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                {isRecording ? (
                  <span className="font-mono tabular-nums">
                    {String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:
                    {String(recordingSeconds % 60).padStart(2, "0")}
                  </span>
                ) : (
                  "Record voice"
                )}
              </button>
            </div>
          </div>
        ) : null}
      </main>

      <div className="md:hidden"><MobileNav /></div>
    </div>
  );
}
