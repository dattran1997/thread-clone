import { Injectable, NotFoundException } from "@nestjs/common";
import * as path from "path";
import * as fs from "fs";
import { spawn } from "child_process";
import { PrismaService } from "../../prisma/prisma.service";

/** Videos ≤ this threshold are served directly; larger ones go through HLS */
const SHORT_VIDEO_THRESHOLD = 50 * 1024 * 1024; // 50 MB

@Injectable()
export class MediaService {
  private readonly uploadDir = path.join(process.cwd(), "uploads");
  private readonly hlsDir   = path.join(process.cwd(), "uploads", "hls");
  private readonly tempDir  = path.join(process.cwd(), "uploads", "temp");

  constructor(private prisma: PrismaService) {
    [this.uploadDir, this.hlsDir, this.tempDir].forEach((dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
  }

  // ── Public upload entry point ───────────────────────────────────────────────
  async upload(file: Express.Multer.File, userId: string) {
    const ext = path.extname(file.originalname).toLowerCase() || ".bin";
    const isVideo = file.mimetype.startsWith("video/");
    const isAudio = file.mimetype.startsWith("audio/");
    const type = isVideo ? "VIDEO" : isAudio ? "AUDIO" : "IMAGE";
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3001";

    // Large videos → background HLS conversion
    if (isVideo && file.size > SHORT_VIDEO_THRESHOLD) {
      return this.processLongVideo(file, ext, userId, backendUrl);
    }

    // Short videos / images / audio → write directly, mark READY
    const filename = `${userId}-${Date.now()}${ext}`;
    const filePath = path.join(this.uploadDir, filename);
    fs.writeFileSync(filePath, file.buffer);
    const url = `${backendUrl}/uploads/${filename}`;

    const media = await this.prisma.threadMedia.create({
      data: { url, type: type as "IMAGE" | "VIDEO" | "AUDIO", order: 0, status: "READY" },
      select: { id: true, url: true, type: true, status: true, hlsUrl: true, duration: true },
    });

    return media;
  }

  // ── Status polling endpoint ─────────────────────────────────────────────────
  async getStatus(mediaId: string) {
    const media = await this.prisma.threadMedia.findUnique({
      where: { id: mediaId },
      select: { id: true, status: true, url: true, hlsUrl: true, duration: true, type: true },
    });
    if (!media) throw new NotFoundException("Media not found");
    return media;
  }

  // ── Long video path ─────────────────────────────────────────────────────────
  private async processLongVideo(
    file: Express.Multer.File,
    ext: string,
    userId: string,
    backendUrl: string,
  ) {
    // Create DB record immediately so the frontend has an ID to poll
    const media = await this.prisma.threadMedia.create({
      data: { url: null, type: "VIDEO", order: 0, status: "PROCESSING" },
      select: { id: true, url: true, type: true, status: true, hlsUrl: true, duration: true },
    });

    // Persist raw bytes to temp folder
    const rawFilename = `${userId}-${Date.now()}${ext}`;
    const rawPath = path.join(this.tempDir, rawFilename);
    fs.writeFileSync(rawPath, file.buffer);

    // Fire-and-forget HLS conversion
    void this.convertToHls(media.id, rawPath, backendUrl);

    return media;
  }

  // ── FFmpeg HLS conversion (background) ─────────────────────────────────────
  private async convertToHls(mediaId: string, rawPath: string, backendUrl: string): Promise<void> {
    const outDir = path.join(this.hlsDir, mediaId);
    fs.mkdirSync(outDir, { recursive: true });
    const playlistPath = path.join(outDir, "playlist.m3u8");

    // Probe duration (best-effort; we still continue even if it fails)
    const duration = await this.probeDuration(rawPath).catch(() => null);

    const ffmpegArgs = [
      "-i", rawPath,
      "-c:v", "libx264",
      "-c:a", "aac",
      "-preset", "fast",
      "-hls_time", "6",
      "-hls_playlist_type", "vod",
      "-hls_segment_filename", path.join(outDir, "segment%03d.ts"),
      playlistPath,
    ];

    return new Promise<void>((resolve) => {
      const proc = spawn("ffmpeg", ffmpegArgs, { stdio: "ignore" });

      proc.on("close", async (code) => {
        try {
          if (code === 0) {
            const hlsUrl = `${backendUrl}/uploads/hls/${mediaId}/playlist.m3u8`;
            await this.prisma.threadMedia.update({
              where: { id: mediaId },
              data: {
                status: "READY",
                hlsUrl,
                ...(duration !== null && { duration }),
              },
            });
          } else {
            await this.prisma.threadMedia.update({
              where: { id: mediaId },
              data: { status: "FAILED" },
            });
          }
        } catch {
          // DB update failure is non-fatal; the record stays PROCESSING and will
          // be treated as FAILED by clients after a reasonable timeout.
        }
        // Delete the temp raw file regardless
        fs.unlink(rawPath, () => {});
        resolve();
      });

      proc.on("error", async () => {
        try {
          await this.prisma.threadMedia.update({
            where: { id: mediaId },
            data: { status: "FAILED" },
          });
        } catch { /* ignore */ }
        fs.unlink(rawPath, () => {});
        resolve();
      });
    });
  }

  // ── ffprobe duration helper ─────────────────────────────────────────────────
  private probeDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const proc = spawn(
        "ffprobe",
        ["-v", "quiet", "-print_format", "json", "-show_format", filePath],
        { stdio: ["ignore", "pipe", "ignore"] },
      );

      let output = "";
      proc.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });

      proc.on("close", (code) => {
        if (code !== 0) { reject(new Error("ffprobe exited non-zero")); return; }
        try {
          const info = JSON.parse(output) as { format?: { duration?: string } };
          const dur = parseFloat(info?.format?.duration ?? "0");
          resolve(Math.round(dur));
        } catch {
          reject(new Error("Failed to parse ffprobe output"));
        }
      });

      proc.on("error", reject);
    });
  }
}
