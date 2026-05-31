import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

const THREAD_INCLUDE = {
  author: {
    select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true },
  },
  media: {
    orderBy: { order: "asc" as const },
    select: { id: true, url: true, type: true, altText: true, order: true, width: true, height: true },
  },
  poll: { include: { options: { orderBy: { order: "asc" as const } } } },
};

@Injectable()
export class FeedService {
  constructor(private prisma: PrismaService) {}

  // ── Following feed ──────────────────────────────────────────────────────────
  async getFollowingFeed(userId: string, cursor?: string, limit = 20) {
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId, status: "ACCEPTED" },
      select: { followingId: true },
    });
    const authorIds = following.map((f) => f.followingId);

    if (!authorIds.length) {
      return { data: [], nextCursor: null, hasMore: false };
    }

    const threads = await this.prisma.thread.findMany({
      where: {
        authorId: { in: authorIds },
        status: "ACTIVE",
        isDraft: false,
        scheduledAt: null,
        parentId: null, // top-level only
      },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: "desc" },
      include: {
        ...THREAD_INCLUDE,
        likes: { where: { userId }, select: { userId: true } },
        reposts: { where: { userId }, select: { userId: true } },
        saves: { where: { userId }, select: { userId: true } },
      },
    });

    const hasMore = threads.length > limit;
    const data = threads.slice(0, limit);

    return {
      data: data.map((t) => this.withViewerState(t, userId)),
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    };
  }

  // ── For You feed (popular threads the user hasn't seen) ─────────────────────
  async getForYouFeed(userId: string, cursor?: string, limit = 20) {
    const threads = await this.prisma.thread.findMany({
      where: {
        status: "ACTIVE",
        isDraft: false,
        scheduledAt: null,
        parentId: null,
        authorId: { not: userId },
      },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: [
        { likeCount: "desc" },
        { replyCount: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        ...THREAD_INCLUDE,
        likes: { where: { userId }, select: { userId: true } },
        reposts: { where: { userId }, select: { userId: true } },
        saves: { where: { userId }, select: { userId: true } },
      },
    });

    const hasMore = threads.length > limit;
    const data = threads.slice(0, limit);

    return {
      data: data.map((t) => this.withViewerState(t, userId)),
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    };
  }

  private withViewerState(thread: any, userId?: string) {
    return {
      ...thread,
      isLiked: userId ? thread.likes?.length > 0 : false,
      isReposted: userId ? thread.reposts?.length > 0 : false,
      isSaved: userId ? thread.saves?.length > 0 : false,
      likes: undefined,
      reposts: undefined,
      saves: undefined,
    };
  }
}
