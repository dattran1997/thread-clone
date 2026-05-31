import {
  Injectable, NotFoundException, ForbiddenException, UnprocessableEntityException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateThreadDto } from "./dto/create-thread.dto";
import { UpdateThreadDto } from "./dto/update-thread.dto";

/** Selects the full Thread shape expected by the frontend */
const THREAD_SELECT = {
  id: true,
  text: true,
  parentId: true,
  rootId: true,
  status: true,
  isGhost: true,
  ghostExpiresAt: true,
  replyPermission: true,
  requireApproval: true,
  isEdited: true,
  editableUntil: true,
  scheduledAt: true,
  isDraft: true,
  likeCount: true,
  replyCount: true,
  repostCount: true,
  quoteCount: true,
  viewCount: true,
  topics: true,
  createdAt: true,
  author: {
    select: {
      id: true, username: true, displayName: true,
      avatarUrl: true, isVerified: true,
    },
  },
  media: {
    orderBy: { order: "asc" as const },
    select: { id: true, url: true, type: true, altText: true, order: true, width: true, height: true },
  },
  poll: {
    include: {
      options: { orderBy: { order: "asc" as const } },
    },
  },
  // Hashtags — include the actual tag text via the relation
  hashtags: {
    select: {
      hashtag: { select: { id: true, tag: true } },
    },
  },
};

@Injectable()
export class ThreadsService {
  constructor(private prisma: PrismaService) {}

  // ── Create ─────────────────────────────────────────────────────────────────
  async create(userId: string, dto: CreateThreadDto) {
    let rootId: string | null = null;
    if (dto.parentId) {
      const parent = await this.prisma.thread.findUnique({
        where: { id: dto.parentId },
        select: { rootId: true, id: true },
      });
      if (!parent) throw new NotFoundException("Parent thread not found");
      rootId = parent.rootId ?? parent.id;
    }

    const editableUntil = new Date(Date.now() + 15 * 60 * 1000);
    const ghostExpiresAt = dto.isGhost ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

    const thread = await this.prisma.thread.create({
      data: {
        authorId: userId,
        text: dto.text,
        parentId: dto.parentId ?? null,
        rootId,
        isGhost: dto.isGhost ?? false,
        ghostExpiresAt,
        replyPermission: (dto.replyPermission as any) ?? "EVERYONE",
        requireApproval: dto.requireApproval ?? false,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        isDraft: dto.isDraft ?? false,
        editableUntil,
        topics: dto.topics ?? [],
        ...(dto.poll && {
          poll: {
            create: {
              expiresAt: new Date(dto.poll.expiresAt),
              options: {
                create: dto.poll.options.map((o, i) => ({ text: o.text, order: i })),
              },
            },
          },
        }),
      },
      select: { id: true },
    });

    // Wire media if provided
    if (dto.mediaIds?.length) {
      await this.prisma.threadMedia.updateMany({
        where: { id: { in: dto.mediaIds } },
        data: { threadId: thread.id },
      });
    }

    // Process hashtags via upsert into Hashtag table + ThreadHashtag join
    if (dto.hashtags?.length) {
      for (const tag of dto.hashtags) {
        const hashtag = await this.prisma.hashtag.upsert({
          where: { tag },
          create: { tag, threadCount: 1 },
          update: { threadCount: { increment: 1 } },
        });
        await this.prisma.threadHashtag.create({
          data: { threadId: thread.id, hashtagId: hashtag.id },
        }).catch(() => { /* ignore duplicate */ });
      }
    }

    // Increment parent reply count
    if (dto.parentId) {
      await this.prisma.thread.update({
        where: { id: dto.parentId },
        data: { replyCount: { increment: 1 } },
      });
    }

    // Fetch and return the full thread shape
    return this.fetchFull(thread.id, userId);
  }

  // ── Get single thread ──────────────────────────────────────────────────────
  async findOne(id: string, viewerId?: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { id },
      select: {
        ...THREAD_SELECT,
        likes:   viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false,
        reposts: viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false,
        saves:   viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false,
      },
    });
    if (!thread || thread.status === "DELETED") throw new NotFoundException("Thread not found");

    // Increment view count (fire-and-forget)
    this.prisma.thread.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

    return this.withViewerState(thread, viewerId);
  }

  // ── Get thread with replies ────────────────────────────────────────────────
  async findWithReplies(id: string, viewerId?: string, cursor?: string, limit = 20) {
    const thread = await this.findOne(id, viewerId);

    const replies = await this.prisma.thread.findMany({
      where: { parentId: id, status: "ACTIVE" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: "asc" },
      select: THREAD_SELECT,
    });
    const hasMore = replies.length > limit;
    return {
      thread,
      replies: replies.slice(0, limit).map((r) => this.withViewerState(r, viewerId)),
      nextCursor: hasMore ? replies[limit - 1].id : null,
      hasMore,
    };
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  async update(id: string, userId: string, dto: UpdateThreadDto) {
    const thread = await this.prisma.thread.findUnique({
      where: { id },
      select: { authorId: true, editableUntil: true, status: true },
    });
    if (!thread || thread.status === "DELETED") throw new NotFoundException("Thread not found");
    if (thread.authorId !== userId) throw new ForbiddenException();
    if (thread.editableUntil && new Date() > thread.editableUntil) {
      throw new UnprocessableEntityException("Edit window has closed (15 minutes)");
    }

    return this.prisma.thread.update({
      where: { id },
      data: {
        ...(dto.text !== undefined && { text: dto.text }),
        ...(dto.topics !== undefined && { topics: dto.topics }),
        isEdited: true,
      },
      select: THREAD_SELECT,
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async delete(id: string, userId: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { id },
      select: { authorId: true, status: true },
    });
    if (!thread || thread.status === "DELETED") throw new NotFoundException("Thread not found");
    if (thread.authorId !== userId) throw new ForbiddenException();

    await this.prisma.thread.update({
      where: { id },
      data: { status: "DELETED" },
    });
  }

  // ── Vote poll ──────────────────────────────────────────────────────────────
  async votePoll(threadId: string, userId: string, optionId: string) {
    const option = await this.prisma.pollOption.findUnique({
      where: { id: optionId },
      include: { poll: true },
    });
    if (!option) throw new NotFoundException("Poll option not found");
    if (new Date() > option.poll.expiresAt) {
      throw new UnprocessableEntityException("Poll has closed");
    }

    // Check if user already voted on any option of this poll
    const existing = await this.prisma.pollVote.findFirst({
      where: {
        userId,
        option: { pollId: option.pollId },
      },
    });
    if (existing) throw new UnprocessableEntityException("Already voted");

    await this.prisma.$transaction([
      this.prisma.pollVote.create({ data: { userId, pollOptionId: optionId } }),
      this.prisma.pollOption.update({
        where: { id: optionId },
        data: { voteCount: { increment: 1 } },
      }),
    ]);

    return this.findOne(threadId, userId);
  }

  // ── Profile threads ────────────────────────────────────────────────────────
  async findByUser(
    userId: string,
    viewerId: string | undefined,
    type: "posts" | "replies" | "reposts",
    cursor?: string,
    limit = 20,
  ) {
    let where: any = { status: "ACTIVE", isDraft: false };

    if (type === "posts") {
      where = { ...where, authorId: userId, parentId: null };
    } else if (type === "replies") {
      where = { ...where, authorId: userId, parentId: { not: null } };
    } else {
      // reposts — find thread IDs the user reposted
      const reposts = await this.prisma.threadRepost.findMany({
        where: { userId },
        select: { threadId: true },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
      });
      const ids = reposts.map((r) => r.threadId);
      where = { id: { in: ids }, status: "ACTIVE" };
    }

    const items = await this.prisma.thread.findMany({
      where,
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: "desc" },
      select: THREAD_SELECT,
    });
    const hasMore = items.length > limit;
    const data = items.slice(0, limit);
    return {
      data: data.map((t) => this.withViewerState(t, viewerId)),
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private async fetchFull(id: string, viewerId?: string) {
    const thread = await this.prisma.thread.findUniqueOrThrow({
      where: { id },
      select: {
        ...THREAD_SELECT,
        likes:   viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false,
        reposts: viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false,
        saves:   viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false,
      },
    });
    return this.withViewerState(thread, viewerId);
  }

  private withViewerState(thread: any, viewerId?: string) {
    return {
      ...thread,
      isLiked:    viewerId ? (thread.likes?.length > 0)   : false,
      isReposted: viewerId ? (thread.reposts?.length > 0) : false,
      isSaved:    viewerId ? (thread.saves?.length > 0)   : false,
      likes:   undefined,
      reposts: undefined,
      saves:   undefined,
    };
  }
}
