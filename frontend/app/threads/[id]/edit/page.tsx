"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import { useAuthStore } from "@/stores/auth";
import { DesktopSidebar } from "@/components/shell/DesktopSidebar";
import { MobileNav } from "@/components/shell/MobileNav";
import { ChevronLeft, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Thread } from "@/components/thread/PostCard";

const MAX_CHARS = 500;

export default function EditThreadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [thread, setThread] = useState<Thread | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);

  useEffect(() => {
    api.get<Thread>(`/threads/${id}`)
      .then((t) => {
        // Check ownership
        if (t.author.id !== user?.id) { router.replace("/"); return; }
        // Check if still editable
        if (!t.editableUntil || new Date() > new Date(t.editableUntil)) {
          toast("Edit window has closed (15 minutes max)", "error");
          router.replace(`/threads/${id}`);
          return;
        }
        setThread(t);
        setText(t.text);
        // Compute minutes left
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
      if (m === 0) {
        clearInterval(interval);
        toast("Edit window closed", "error");
        router.replace(`/threads/${id}`);
      }
    }, 30_000); // update every 30s
    return () => clearInterval(interval);
  }, [thread, id, router, minutesLeft]);

  async function handleSave() {
    if (!text.trim() || text.length > MAX_CHARS || saving) return;
    setSaving(true);
    try {
      await api.patch(`/threads/${id}`, { text: text.trim() });
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
  const changed = thread ? text !== thread.text : false;

  return (
    <div className="flex min-h-screen w-full justify-center bg-background text-foreground">
      <div className="hidden md:flex flex-col h-screen sticky top-0 border-r border-border w-[252px] flex-shrink-0">
        <DesktopSidebar />
      </div>

      <main className="w-full max-w-[622px] border-r border-border min-h-screen pb-14 md:pb-0">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-4 bg-background/90 backdrop-blur-xl border-b border-border">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="rounded-full p-2 text-foreground hover:bg-foreground/10 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-semibold text-foreground">Edit thread</span>
          </div>
          <button
            onClick={handleSave}
            disabled={!changed || overLimit || saving}
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

            {/* Textarea */}
            <div className="flex flex-col gap-2">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoFocus
                rows={6}
                className="w-full resize-none bg-secondary rounded-xl p-4 text-[15px] text-foreground placeholder:text-muted-foreground outline-none leading-relaxed focus:ring-1 focus:ring-primary transition-all"
                placeholder="What's on your mind?"
              />

              {/* Char counter */}
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-muted-foreground">
                  You can only edit text — media and polls cannot be changed.
                </span>
                <span className={cn(
                  "text-[13px] font-medium",
                  overLimit ? "text-destructive" : remaining < 50 ? "text-amber-500" : "text-muted-foreground",
                )}>
                  {remaining}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <div className="md:hidden"><MobileNav /></div>
    </div>
  );
}
