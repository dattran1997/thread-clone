import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(
    q: string,
    type: "users" | "threads" | "tags",
    viewerId?: string,
    cursor?: string,
    limit = 20,
  ) {
    if (type === "users") {
      return this.searchUsers(q, cursor, limit);
    }
    if (type === "threads") {
      return this.searchThreads(q, viewerId, cursor, limit);
    }
    return this.searchTags(q, cursor, limit);
  }

  private async searchUsers(q: string, cursor?: string, limit = 20) {
    const items = await this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { displayName: { contains: q, mode: "insensitive" } },
        ],
        deletedAt: null,
      },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isVerified: true,
        bio: true,
        _count: { select: { followers: true } },
      },
    });

    const hasMore = items.length > limit;
    const data = items.slice(0, limit);
    return {
      data,
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    };
  }

  private async searchThreads(q: string, viewerId?: string, cursor?: string, limit = 20) {
    const items = await this.prisma.thread.findMany({
      where: {
        text: { contains: q, mode: "insensitive" },
        status: "ACTIVE",
        isDraft: false,
        scheduledAt: null,
      },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        text: true,
        createdAt: true,
        likeCount: true,
        replyCount: true,
        repostCount: true,
        viewCount: true,
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true },
        },
        media: {
          select: { id: true, url: true, type: true, altText: true, order: true },
          orderBy: { order: "asc" },
        },
      },
    });

    const hasMore = items.length > limit;
    const data = items.slice(0, limit);
    return {
      data,
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    };
  }

  private async searchTags(q: string, cursor?: string, limit = 20) {
    const items = await this.prisma.hashtag.findMany({
      where: {
        tag: { contains: q, mode: "insensitive" },
      },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { threadCount: "desc" },
      select: { id: true, tag: true, threadCount: true },
    });

    const hasMore = items.length > limit;
    const data = items.slice(0, limit);
    return {
      data,
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    };
  }
}
