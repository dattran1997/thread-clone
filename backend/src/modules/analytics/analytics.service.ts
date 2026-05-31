import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

type ChartRange = "7d" | "30d" | "90d";

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getSummary(userId: string) {
    const threads = await this.prisma.thread.findMany({
      where: { authorId: userId, status: "ACTIVE" },
      select: {
        likeCount: true,
        replyCount: true,
        repostCount: true,
        quoteCount: true,
        viewCount: true,
        createdAt: true,
      },
    });

    const now = new Date();
    const periodDays = 30;
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const prevPeriodStart = new Date(now.getTime() - 2 * periodDays * 24 * 60 * 60 * 1000);

    type ThreadRow = (typeof threads)[number];

    const current = threads.filter((t: ThreadRow) => t.createdAt >= periodStart);
    const previous = threads.filter(
      (t: ThreadRow) => t.createdAt >= prevPeriodStart && t.createdAt < periodStart,
    );

    const sum = (arr: ThreadRow[]) => ({
      likeCount: arr.reduce((s: number, t: ThreadRow) => s + t.likeCount, 0),
      replyCount: arr.reduce((s: number, t: ThreadRow) => s + t.replyCount, 0),
      repostCount: arr.reduce((s: number, t: ThreadRow) => s + t.repostCount, 0),
      quoteCount: arr.reduce((s: number, t: ThreadRow) => s + t.quoteCount, 0),
      viewCount: arr.reduce((s: number, t: ThreadRow) => s + t.viewCount, 0),
    });

    const currentTotals = sum(current);
    const previousTotals = sum(previous);

    const pctChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    return {
      period: `${periodDays}d`,
      threadCount: threads.length,
      current: currentTotals,
      previous: previousTotals,
      changes: {
        likes: pctChange(currentTotals.likeCount, previousTotals.likeCount),
        replies: pctChange(currentTotals.replyCount, previousTotals.replyCount),
        reposts: pctChange(currentTotals.repostCount, previousTotals.repostCount),
        views: pctChange(currentTotals.viewCount, previousTotals.viewCount),
      },
    };
  }

  async getChart(userId: string, range: ChartRange) {
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const threads = await this.prisma.thread.findMany({
      where: {
        authorId: userId,
        status: "ACTIVE",
        createdAt: { gte: since },
      },
      select: {
        likeCount: true,
        replyCount: true,
        repostCount: true,
        viewCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Group by date (YYYY-MM-DD)
    const byDate: Record<
      string,
      { views: number; likes: number; replies: number; reposts: number }
    > = {};

    for (let i = 0; i < days; i++) {
      const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      byDate[key] = { views: 0, likes: 0, replies: 0, reposts: 0 };
    }

    for (const t of threads) {
      const key = t.createdAt.toISOString().split("T")[0];
      if (byDate[key]) {
        byDate[key].views += t.viewCount;
        byDate[key].likes += t.likeCount;
        byDate[key].replies += t.replyCount;
        byDate[key].reposts += t.repostCount;
      }
    }

    return Object.entries(byDate).map(([date, metrics]) => ({ date, ...metrics }));
  }

  async getThreadInsight(threadId: string, userId: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
      select: {
        id: true,
        text: true,
        authorId: true,
        likeCount: true,
        replyCount: true,
        repostCount: true,
        quoteCount: true,
        viewCount: true,
        createdAt: true,
        status: true,
      },
    });

    if (!thread || thread.status === "DELETED") throw new NotFoundException("Thread not found");
    if (thread.authorId !== userId) throw new ForbiddenException("Not your thread");

    return thread;
  }
}
