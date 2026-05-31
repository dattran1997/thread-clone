import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCommunityDto } from "./dto/communities.dto";

@Injectable()
export class CommunitiesService {
  constructor(private prisma: PrismaService) {}

  async findAll(cursor?: string, limit = 20) {
    const items = await this.prisma.community.findMany({
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { memberCount: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        avatarUrl: true,
        memberCount: true,
        createdAt: true,
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

  async findById(id: string) {
    const community = await this.prisma.community.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        avatarUrl: true,
        memberCount: true,
        createdAt: true,
      },
    });
    if (!community) throw new NotFoundException("Community not found");
    return community;
  }

  async create(userId: string, dto: CreateCommunityDto) {
    return (this.prisma as any).$transaction(async (tx: any) => {
      const community = await tx.community.create({
        data: {
          name: dto.name,
          description: dto.description,
          avatarUrl: dto.avatarUrl,
          memberCount: 1,
        },
      });

      await tx.communityMember.create({
        data: {
          communityId: community.id,
          userId,
          isChampion: true,
        },
      });

      return community;
    });
  }

  async join(communityId: string, userId: string) {
    const community = await this.prisma.community.findUnique({ where: { id: communityId } });
    if (!community) throw new NotFoundException("Community not found");

    const existing = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
    if (existing) throw new ConflictException("Already a member");

    await this.prisma.$transaction([
      this.prisma.communityMember.create({ data: { communityId, userId } }),
      this.prisma.community.update({
        where: { id: communityId },
        data: { memberCount: { increment: 1 } },
      }),
    ]);

    return { joined: true };
  }

  async leave(communityId: string, userId: string) {
    const member = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
    if (!member) throw new NotFoundException("Not a member of this community");
    if (member.isChampion) {
      throw new ForbiddenException("Community owner cannot leave; transfer ownership first");
    }

    await this.prisma.$transaction([
      this.prisma.communityMember.delete({
        where: { communityId_userId: { communityId, userId } },
      }),
      this.prisma.community.update({
        where: { id: communityId },
        data: { memberCount: { decrement: 1 } },
      }),
    ]);

    return { left: true };
  }

  async getMembers(communityId: string, cursor?: string, limit = 20) {
    const community = await this.prisma.community.findUnique({ where: { id: communityId } });
    if (!community) throw new NotFoundException("Community not found");

    const items = await this.prisma.communityMember.findMany({
      where: { communityId },
      take: limit + 1,
      ...(cursor && {
        cursor: { communityId_userId: { communityId, userId: cursor } },
        skip: 1,
      }),
      orderBy: { joinedAt: "asc" },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true },
        },
      },
    });

    const hasMore = items.length > limit;
    const data = items.slice(0, limit).map((m: any) => ({
      ...m.user,
      flair: m.flair,
      isChampion: m.isChampion,
      joinedAt: m.joinedAt,
    }));

    return {
      data,
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    };
  }
}
