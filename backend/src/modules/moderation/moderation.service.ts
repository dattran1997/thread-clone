import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateReportDto } from "./dto/moderation.dto";

@Injectable()
export class ModerationService {
  constructor(private prisma: PrismaService) {}

  // ── Block ──────────────────────────────────────────────────────────────────
  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new ConflictException("Cannot block yourself");
    }

    const target = await this.prisma.user.findUnique({ where: { id: blockedId }, select: { id: true } });
    if (!target) throw new NotFoundException("User not found");

    const existing = await this.prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    if (existing) throw new ConflictException("Already blocked");

    // Also remove any follow relationship
    await this.prisma.$transaction([
      this.prisma.block.create({ data: { blockerId, blockedId } }),
      this.prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: blockerId, followingId: blockedId },
            { followerId: blockedId, followingId: blockerId },
          ],
        },
      }),
    ]);

    return { blocked: true };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    const existing = await this.prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    if (!existing) throw new NotFoundException("Block not found");

    await this.prisma.block.delete({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });

    return { blocked: false };
  }

  async getBlocks(userId: string) {
    const blocks = await this.prisma.block.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return blocks.map((b: typeof blocks[number]) => b.blocked);
  }

  // ── Mute ───────────────────────────────────────────────────────────────────
  async muteUser(muterId: string, mutedId: string) {
    if (muterId === mutedId) {
      throw new ConflictException("Cannot mute yourself");
    }

    const target = await this.prisma.user.findUnique({ where: { id: mutedId }, select: { id: true } });
    if (!target) throw new NotFoundException("User not found");

    const existing = await this.prisma.mute.findUnique({
      where: { muterId_mutedId: { muterId, mutedId } },
    });
    if (existing) throw new ConflictException("Already muted");

    await this.prisma.mute.create({ data: { muterId, mutedId } });
    return { muted: true };
  }

  async unmuteUser(muterId: string, mutedId: string) {
    const existing = await this.prisma.mute.findUnique({
      where: { muterId_mutedId: { muterId, mutedId } },
    });
    if (!existing) throw new NotFoundException("Mute not found");

    await this.prisma.mute.delete({ where: { muterId_mutedId: { muterId, mutedId } } });
    return { muted: false };
  }

  // ── Reports ────────────────────────────────────────────────────────────────
  async createReport(reporterId: string, dto: CreateReportDto) {
    return this.prisma.report.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        note: dto.note,
      },
    });
  }

  async getReports(cursor?: string, limit = 20) {
    const items = await this.prisma.report.findMany({
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: "desc" },
      include: {
        reporter: {
          select: { id: true, username: true, displayName: true },
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
}
