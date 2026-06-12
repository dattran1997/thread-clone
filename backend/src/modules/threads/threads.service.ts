import {
  Injectable, NotFoundException, ForbiddenException, UnprocessableEntityException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateThreadDto } from "./dto/create-thread.dto";
import { UpdateThreadDto } from "./dto/update-thread.dto";

// ── Viewer-independent base select ────────────────────────────────────────────
const BASE_SELECT = {
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
  hashtags: {
    select: {
      hashtag: { select: { tag: true } },
    },
  },
} as const;

/** Build the full Prisma select object, injecting viewer-dependent fields */
function makeSelect(viewerId?: string) {
  return {
    ...BASE_SELECT,
    // Like / repost / save state for this viewer
    likes:   viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false,
    reposts: viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false,
    saves:   viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false,
    // Poll with per-option vote count + viewer vote
    poll: {
      select: {
        id: true,
        expiresAt: true,
        options: {
          orderBy: { order: "asc" as const },
          select: {
            id: true,
            text: true,
            order: true,
            voteCount: true,
            // Which options did this viewer vote on?
            votes: viewerId
              ? { where: { userId: viewerId }, select: { userId: true } }
              : false,
          },
        },
      },
    },
  } as const;
}

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

    // Wire media
    if (dto.mediaIds?.length) {
      await this.prisma.threadMedia.updateMany({
        where: { id: { in: dto.mediaIds } },
        data: { threadId: thread.id },
      });
    }

    // Process hashtags found in text OR explicitly passed
    const hashtagsToProcess = dto.hashtags ?? extractHashtags(dto.text);
    if (hashtagsToProcess.length) {
      for (const tag of hashtagsToProcess) {
        const ht = await this.prisma.hashtag.upsert({
          where: { tag },
          create: { tag, threadCount: 1 },
          update: { threadCount: { increment: 1 } },
        });
        await this.prisma.threadHashtag.create({
          data: { threadId: thread.id, hashtagId: ht.id },
        }).catch(() => {});
      }
    }

    // Increment parent reply count
    if (dto.parentId) {
      await this.prisma.thread.update({
        where: { id: dto.parentId },
        data: { replyCount: { increment: 1 } },
      });
    }

    return this.fetchFull(thread.id, userId);
  }

  // ── Get single thread ──────────────────────────────────────────────────────
  async findOne(id: string, viewerId?: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { id },
      select: makeSelect(viewerId),
    });
    if (!thread || thread.status === "DELETED") throw new NotFoundException("Thread not found");

    this.prisma.thread
      .update({ where: { id }, data: { viewCount: { increment: 1 } } })
      .catch(() => {});

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
      select: makeSelect(viewerId), // ← now includes viewer state for replies too
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

    await this.prisma.thread.update({
      where: { id },
      data: {
        ...(dto.text !== undefined && { text: dto.text }),
        ...(dto.topics !== undefined && { topics: dto.topics }),
        isEdited: true,
      },
    });

    return this.fetchFull(id, userId);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async delete(id: string, userId: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { id },
      select: { authorId: true, status: true, parentId: true },
    });
    if (!thread || thread.status === "DELETED") throw new NotFoundException("Thread not found");
    if (thread.authorId !== userId) throw new ForbiddenException();

    await this.prisma.thread.update({
      where: { id },
      data: { status: "DELETED" },
    });

    // Decrement parent reply count
    if (thread.parentId) {
      await this.prisma.thread.update({
        where: { id: thread.parentId },
        data: { replyCount: { decrement: 1 } },
      }).catch(() => {});
    }
  }

  // ── Vote poll ──────────────────────────────────────────────────────────────
  async votePoll(threadId: string, userId: string, optionId: string) {
    const option = await this.prisma.pollOption.findUnique({
      where: { id: optionId },
      include: { poll: true },
    });
    if (!option) throw new NotFoundException("Poll option not found");
    if (option.poll.threadId !== threadId) throw new NotFoundException("Poll option not found");
    if (new Date() > option.poll.expiresAt) {
      throw new UnprocessableEntityException("Poll has closed");
    }

    const existing = await this.prisma.pollVote.findFirst({
      where: { userId, option: { pollId: option.pollId } },
    });
    if (existing) throw new UnprocessableEntityException("Already voted");

    await this.prisma.$transaction([
      this.prisma.pollVote.create({ data: { userId, pollOptionId: optionId } }),
      this.prisma.pollOption.update({
        where: { id: optionId },
        data: { voteCount: { increment: 1 } },
      }),
    ]);

    return this.fetchFull(threadId, userId);
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
      select: makeSelect(viewerId),
    });
    const hasMore = items.length > limit;
    const data = items.slice(0, limit);
    return {
      data: data.map((t) => this.withViewerState(t, viewerId)),
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    };
  }

  // ── Saved threads list ─────────────────────────────────────────────────────
  async findSaved(userId: string, cursor?: string, limit = 20) {
    const saves = await this.prisma.threadSave.findMany({
      where: { userId },
      take: limit + 1,
      ...(cursor && {
        cursor: { userId_threadId: { userId, threadId: cursor } },
        skip: 1,
      }),
      orderBy: { createdAt: "desc" },
      select: { threadId: true },
    });

    const hasMore = saves.length > limit;
    const ids = saves.slice(0, limit).map((s) => s.threadId);

    const threads = await this.prisma.thread.findMany({
      where: { id: { in: ids }, status: "ACTIVE" },
      select: makeSelect(userId),
    });

    // Preserve save order
    const ordered = ids.map((id) => threads.find((t) => t.id === id)).filter(Boolean) as typeof threads;

    return {
      data: ordered.map((t) => this.withViewerState(t, userId)),
      nextCursor: hasMore ? ids[ids.length - 1] : null,
      hasMore,
    };
  }

  // ── Increment view count ───────────────────────────────────────────────────
  async incrementView(id: string) {
    await this.prisma.thread.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private async fetchFull(id: string, viewerId?: string) {
    const thread = await this.prisma.thread.findUniqueOrThrow({
      where: { id },
      select: makeSelect(viewerId),
    });
    return this.withViewerState(thread, viewerId);
  }

  private withViewerState(raw: any, viewerId?: string) {
    // Map hashtags from join-table objects → plain string[]
    const hashtags: string[] = (raw.hashtags ?? []).map(
      (h: { hashtag: { tag: string } }) => h.hashtag.tag,
    );

    // Compute poll state
    let poll: any = null;
    if (raw.poll) {
      const totalVotes = (raw.poll.options as any[]).reduce(
        (sum: number, o: any) => sum + (o.voteCount ?? 0),
        0,
      );
      const votedOption = (raw.poll.options as any[]).find(
        (o: any) => (o.votes?.length ?? 0) > 0,
      );
      poll = {
        id: raw.poll.id,
        expiresAt: raw.poll.expiresAt,
        totalVotes,
        userVoteOptionId: votedOption?.id ?? null,
        options: (raw.poll.options as any[]).map((o: any) => ({
          id: o.id,
          text: o.text,
          order: o.order,
          voteCount: o.voteCount,
          hasVoted: (o.votes?.length ?? 0) > 0,
        })),
      };
    }

    return {
      ...raw,
      hashtags,
      poll,
      isLiked:    viewerId ? ((raw.likes?.length  ?? 0) > 0) : false,
      isReposted: viewerId ? ((raw.reposts?.length ?? 0) > 0) : false,
      isSaved:    viewerId ? ((raw.saves?.length   ?? 0) > 0) : false,
      // Remove raw relation arrays from response
      likes:   undefined,
      reposts: undefined,
      saves:   undefined,
    };
  }
}

// ── Utility: extract #hashtag words from text ─────────────────────────────────
function extractHashtags(text: string): string[] {
  const matches = text.match(/#([a-zA-Z]\w{0,49})/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}
