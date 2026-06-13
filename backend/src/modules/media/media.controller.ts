import {
  Controller,
  Get,
  Post,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from "@nestjs/swagger";
import { memoryStorage } from "multer";
import { MediaService } from "./media.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

const IMAGE_MAX_SIZE = 10  * 1024 * 1024;  // 10 MB
const AUDIO_MAX_SIZE = 50  * 1024 * 1024;  // 50 MB
const VIDEO_MAX_SIZE = 500 * 1024 * 1024;  // 500 MB

@ApiTags("media")
@ApiBearerAuth()
@Controller("media")
export class MediaController {
  constructor(private mediaService: MediaService) {}

  // ── Upload ──────────────────────────────────────────────────────────────────
  @Post("upload")
  @ApiOperation({ summary: "Upload a media file (images/audio direct; large videos → HLS)" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: VIDEO_MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        const isImage = file.mimetype.startsWith("image/");
        const isVideo = file.mimetype.startsWith("video/");
        const isAudio = file.mimetype.startsWith("audio/");
        if (!isImage && !isVideo && !isAudio) {
          return cb(new BadRequestException("Only image, video, and audio files are allowed"), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadFile(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("No file uploaded");

    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");
    const isAudio = file.mimetype.startsWith("audio/");

    if (isImage && file.size > IMAGE_MAX_SIZE) {
      throw new BadRequestException("Image files must be under 10 MB");
    }
    if (isAudio && file.size > AUDIO_MAX_SIZE) {
      throw new BadRequestException("Audio files must be under 50 MB");
    }
    if (isVideo && file.size > VIDEO_MAX_SIZE) {
      throw new BadRequestException("Video files must be under 500 MB");
    }

    return this.mediaService.upload(file, user.id);
  }

  // ── Status polling ──────────────────────────────────────────────────────────
  @Get(":id/status")
  @ApiOperation({ summary: "Poll processing status for a media item" })
  async getStatus(@Param("id") id: string) {
    return this.mediaService.getStatus(id);
  }
}
