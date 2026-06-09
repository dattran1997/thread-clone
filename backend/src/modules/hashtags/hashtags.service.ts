import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class HashtagsService {
  constructor(private prisma: PrismaService) {}

  /** Return the top N hashtags ordered by thread count */
  async getTrending(limit = 10) {
    const hashtags = await this.prisma.hashtag.findMany({
      orderBy: { threadCount: "desc" },
      take: limit,
      select: { id: true, tag: true, threadCount: true },
    });
    return hashtags;
  }
}
