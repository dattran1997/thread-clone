import { Injectable } from "@nestjs/common";
import * as path from "path";
import * as fs from "fs";
import { randomUUID } from "crypto";

@Injectable()
export class MediaService {
  private readonly uploadDir = path.join(process.cwd(), "uploads");

  constructor() {
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(file: Express.Multer.File, userId: string) {
    const ext = path.extname(file.originalname).toLowerCase() || ".bin";
    const id = randomUUID();
    const filename = `${userId}-${id}${ext}`;
    const filePath = path.join(this.uploadDir, filename);

    // Write file buffer to disk
    fs.writeFileSync(filePath, file.buffer);

    const isVideo = file.mimetype.startsWith("video/");
    const type: "IMAGE" | "VIDEO" = isVideo ? "VIDEO" : "IMAGE";
    const url = `/uploads/${filename}`;

    // Return a virtual media record — threadId will be assigned when the thread is created
    // The threads service uses dto.mediaIds to call threadMedia.updateMany
    // For now we return a stable id so the client can reference it in CreateThreadDto.mediaIds
    return { id, url, type };
  }
}
