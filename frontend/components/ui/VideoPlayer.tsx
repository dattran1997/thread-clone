"use client";
import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";

type MediaStatus = "READY" | "PROCESSING" | "FAILED";

interface VideoPlayerProps {
  /** Server-assigned media ID — used for status polling */
  mediaId: string;
  /** Direct video URL (short videos or fallback) */
  url: string | null;
  /** HLS master playlist URL (long videos after FFmpeg conversion) */
  hlsUrl: string | null;
  /** Current processing status */
  status: MediaStatus;
  /** Video duration in seconds */
  duration?: number | null;
  className?: string;
}

interface StatusResponse {
  id: string;
  status: MediaStatus;
  url: string | null;
  hlsUrl: string | null;
  duration: number | null;
}

/**
 * Smart video player that:
 *  - Shows a spinner while a video is being converted to HLS
 *  - Plays HLS streams via hls.js (dynamically imported to avoid SSR)
 *  - Falls back to a native <video> for short/direct-upload videos
 *  - Shows an error state when conversion failed
 *  - Polls /media/:id/status every 3 s while PROCESSING
 */
export function VideoPlayer({
  mediaId,
  url: initialUrl,
  hlsUrl: initialHlsUrl,
  status: initialStatus,
  className = "",
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<MediaStatus>(initialStatus);
  const [url, setUrl] = useState(initialUrl);
  const [hlsUrl, setHlsUrl] = useState(initialHlsUrl);
  const hlsRef = useRef<import("hls.js").default | null>(null);

  // ── Poll while PROCESSING ──────────────────────────────────────────────────
  useEffect(() => {
    if (status !== "PROCESSING") return;

    const timer = setInterval(async () => {
      try {
        const data = await api.get<StatusResponse>(`/media/${mediaId}/status`);
        if (data.status !== "PROCESSING") {
          setStatus(data.status);
          setUrl(data.url);
          setHlsUrl(data.hlsUrl);
          clearInterval(timer);
        }
      } catch {
        // silent — keep polling
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [status, mediaId]);

  // ── Attach hls.js when we have a HLS URL ──────────────────────────────────
  useEffect(() => {
    if (status !== "READY" || !hlsUrl || !videoRef.current) return;

    let cancelled = false;

    (async () => {
      const Hls = (await import("hls.js")).default;
      if (cancelled || !videoRef.current) return;

      if (Hls.isSupported()) {
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(hlsUrl);
        hls.attachMedia(videoRef.current);
      } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
        // Native HLS (Safari / iOS)
        videoRef.current.src = hlsUrl;
      }
    })();

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [status, hlsUrl]);

  // ── Processing state ───────────────────────────────────────────────────────
  if (status === "PROCESSING") {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-black/10 rounded-xl ${className}`}>
        <Loader2 size={28} className="animate-spin text-muted-foreground" />
        <span className="text-[12px] text-muted-foreground font-medium">Processing video…</span>
      </div>
    );
  }

  // ── Failed state ───────────────────────────────────────────────────────────
  if (status === "FAILED") {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-destructive/10 rounded-xl ${className}`}>
        <AlertCircle size={28} className="text-destructive" />
        <span className="text-[12px] text-destructive font-medium">Video processing failed</span>
      </div>
    );
  }

  // ── HLS stream (long video, READY) ─────────────────────────────────────────
  if (hlsUrl) {
    return (
      <video
        ref={videoRef}
        className={`${className}`}
        controls
        playsInline
        preload="metadata"
      />
    );
  }

  // ── Direct video (short video, READY) ─────────────────────────────────────
  if (url) {
    return (
      <video
        src={url}
        className={`${className}`}
        controls
        playsInline
        preload="metadata"
      />
    );
  }

  // Fallback — shouldn't normally be reached
  return (
    <div className={`flex items-center justify-center bg-black/10 rounded-xl ${className}`}>
      <RefreshCw size={20} className="text-muted-foreground" />
    </div>
  );
}
