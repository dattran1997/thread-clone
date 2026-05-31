import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByUsername(username: string, viewerId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        _count: {
          select: { threads: true, followers: true, following: true },
        },
      },
    });
    if (!user) throw new NotFoundException("User not found");

    let isFollowing = false;
    let isFollowedBy = false;
    if (viewerId && viewerId !== user.id) {
      const [fwd, rev] = await Promise.all([
        this.prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
        }),
        this.prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: user.id, followingId: viewerId } },
        }),
      ]);
      isFollowing = fwd?.status === "ACCEPTED";
      isFollowedBy = rev?.status === "ACCEPTED";
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      links: user.links,
      topics: user.topics,
      notes: user.notes,
      isVerified: user.isVerified,
      isPrivate: user.isPrivate,
      role: user.role,
      threadCount: user._count.threads,
      followerCount: user._count.followers,
      followingCount: user._count.following,
      isFollowing,
      isFollowedBy,
      createdAt: user.createdAt,
    };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.links !== undefined && { links: dto.links }),
        ...(dto.topics !== undefined && { topics: dto.topics }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      select: {
        id: true, username: true, displayName: true, bio: true,
        avatarUrl: true, links: true, topics: true, notes: true,
        isVerified: true, isPrivate: true, role: true,
      },
    });
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: { id: true, avatarUrl: true },
    });
  }

  async checkUsernameAvailability(username: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    return { available: !user };
  }

  async getFollowers(userId: string, cursor?: string, limit = 20) {
    const items = await this.prisma.follow.findMany({
      where: { followingId: userId, status: "ACCEPTED" },
      take: limit + 1,
      // Cursor is the followerId from the previous page's last row
      ...(cursor && {
        cursor: { followerId_followingId: { followerId: cursor, followingId: userId } },
        skip: 1,
      }),
      include: { follower: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } } },
      orderBy: { createdAt: "desc" },
    });
    const hasMore = items.length > limit;
    const data = items.slice(0, limit);
    return {
      data: data.map((f) => ({ ...f.follower, followedAt: f.createdAt })),
      nextCursor: hasMore ? data[data.length - 1].followerId : null,
      hasMore,
    };
  }

  async getFollowing(userId: string, cursor?: string, limit = 20) {
    const items = await this.prisma.follow.findMany({
      where: { followerId: userId, status: "ACCEPTED" },
      take: limit + 1,
      // Cursor is the followingId from the previous page's last row
      ...(cursor && {
        cursor: { followerId_followingId: { followerId: userId, followingId: cursor } },
        skip: 1,
      }),
      include: { following: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } } },
      orderBy: { createdAt: "desc" },
    });
    const hasMore = items.length > limit;
    const data = items.slice(0, limit);
    return {
      data: data.map((f) => ({ ...f.following, followedAt: f.createdAt })),
      nextCursor: hasMore ? data[data.length - 1].followingId : null,
      hasMore,
    };
  }

  async deactivate(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false, deletedAt: new Date() },
    });
  }
}
