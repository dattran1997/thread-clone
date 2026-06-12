import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class ReactionsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
    private notificationsService: NotificationsService,
  ) {}

  private async ensureThread(id: string) {
    const t = await this.prisma.thread.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!t || t.status === "DELETED") throw new NotFoundException("Thread not found");
    return t;
  }

  /** Fetch current counts and broadcast to all sockets watching this thread */
  private async broadcastThreadCounts(threadId: string) {
    const t = await this.prisma.thread.findUnique({
      where: { id: threadId },
      select: { likeCount: true, repostCount: true, replyCount: true },
    });
    if (t) this.gateway.emitThreadUpdate(threadId, t);
  }

  // ── Like ────────────────────────────────────────────────────────────────────
  async like(threadId: string, userId: string) {
    await this.ensureThread(threadId);
    const existing = await this.prisma.threadLike.findUnique({
      where: { userId_threadId: { userId, threadId } },
    });
    if (existing) return { liked: true };

    const [, thread] = await this.prisma.$transaction([
      this.prisma.threadLike.create({ data: { userId, threadId } }),
      this.prisma.thread.update({ where: { id: threadId }, data: { likeCount: { increment: 1 } } }),
    ]);
    this.broadcastThreadCounts(threadId).catch(() => {});

    // Notify thread author (not self-likes)
    if (thread.authorId !== userId) {
      this.notificationsService.create({
        recipientId: thread.authorId,
        actorId: userId,
        type: "LIKE",
        entityId: threadId,
        entityType: "thread",
      }).then((n) => this.gateway.emitToUser(thread.authorId, "notification", n)).catch(() => {});
    }

    return { liked: true };
  }

  async unlike(threadId: string, userId: string) {
    await this.ensureThread(threadId);
    const existing = await this.prisma.threadLike.findUnique({
      where: { userId_threadId: { userId, threadId } },
    });
    if (!existing) return { liked: false };

    await this.prisma.$transaction([
      this.prisma.threadLike.delete({ where: { userId_threadId: { userId, threadId } } }),
      this.prisma.thread.update({ where: { id: threadId }, data: { likeCount: { decrement: 1 } } }),
    ]);
    this.broadcastThreadCounts(threadId).catch(() => {});
    return { liked: false };
  }

  // ── Repost ──────────────────────────────────────────────────────────────────
  async repost(threadId: string, userId: string) {
    await this.ensureThread(threadId);
    const existing = await this.prisma.threadRepost.findUnique({
      where: { userId_threadId: { userId, threadId } },
    });
    if (existing) return { reposted: true };

    const [, thread] = await this.prisma.$transaction([
      this.prisma.threadRepost.create({ data: { userId, threadId } }),
      this.prisma.thread.update({ where: { id: threadId }, data: { repostCount: { increment: 1 } } }),
    ]);
    this.broadcastThreadCounts(threadId).catch(() => {});

    // Notify thread author (not self-reposts)
    if (thread.authorId !== userId) {
      this.notificationsService.create({
        recipientId: thread.authorId,
        actorId: userId,
        type: "REPOST",
        entityId: threadId,
        entityType: "thread",
      }).then((n) => this.gateway.emitToUser(thread.authorId, "notification", n)).catch(() => {});
    }

    return { reposted: true };
  }

  async unrepost(threadId: string, userId: string) {
    await this.ensureThread(threadId);
    const existing = await this.prisma.threadRepost.findUnique({
      where: { userId_threadId: { userId, threadId } },
    });
    if (!existing) return { reposted: false };

    await this.prisma.$transaction([
      this.prisma.threadRepost.delete({ where: { userId_threadId: { userId, threadId } } }),
      this.prisma.thread.update({ where: { id: threadId }, data: { repostCount: { decrement: 1 } } }),
    ]);
    this.broadcastThreadCounts(threadId).catch(() => {});
    return { reposted: false };
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  async save(threadId: string, userId: string) {
    await this.ensureThread(threadId);
    await this.prisma.threadSave.upsert({
      where: { userId_threadId: { userId, threadId } },
      create: { userId, threadId },
      update: {},
    });
    return { saved: true };
  }

  async unsave(threadId: string, userId: string) {
    await this.ensureThread(threadId);
    await this.prisma.threadSave.deleteMany({ where: { userId, threadId } });
    return { saved: false };
  }

  // ── Quote ───────────────────────────────────────────────────────────────────
  async quote(threadId: string, userId: string, quoteText: string) {
    await this.ensureThread(threadId);
    const q = await this.prisma.threadQuote.create({
      data: { userId, threadId, quoteText },
    });
    await this.prisma.thread.update({
      where: { id: threadId },
      data: { quoteCount: { increment: 1 } },
    });
    return q;
  }

  // ── Likes list ───────────────────────────────────────────────────────────────
  async getLikes(threadId: string, cursor?: string, limit = 20) {
    const items = await this.prisma.threadLike.findMany({
      where: { threadId },
      take: limit + 1,
      ...(cursor && { cursor: { userId_threadId: { userId: cursor, threadId } }, skip: 1 }),
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
      },
    });
    const hasMore = items.length > limit;
    const data = items.slice(0, limit);
    return {
      data: data.map((l) => l.user),
      nextCursor: hasMore ? data[data.length - 1].userId : null,
      hasMore,
    };
  }
}
