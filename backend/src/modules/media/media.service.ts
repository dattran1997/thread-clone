import { Injectable } from "@nestjs/common";
import * as path from "path";
import * as fs from "fs";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class MediaService {
  private readonly uploadDir = path.join(process.cwd(), "uploads");

  constructor(private prisma: PrismaService) {
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(file: Express.Multer.File, userId: string) {
    const ext = path.extname(file.originalname).toLowerCase() || ".bin";
    const filename = `${userId}-${Date.now()}${ext}`;
    const filePath = path.join(this.uploadDir, filename);

    // Write file buffer to disk
    fs.writeFileSync(filePath, file.buffer);

    const isVideo = file.mimetype.startsWith("video/");
    const isAudio = file.mimetype.startsWith("audio/");
    const type = isVideo ? "VIDEO" : isAudio ? "AUDIO" : "IMAGE";
    // Use absolute URL so frontend can load the file across origins
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3001";
    const url = `${backendUrl}/uploads/${filename}`;

    // Create a ThreadMedia record with threadId = null.
    // The thread creation service will call threadMedia.updateMany to link it.
    const media = await this.prisma.threadMedia.create({
      data: { url, type: type as "IMAGE" | "VIDEO" | "AUDIO", order: 0 },
      select: { id: true, url: true, type: true },
    });

    return media;
  }
}
