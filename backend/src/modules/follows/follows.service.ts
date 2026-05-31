import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class FollowsService {
  constructor(private prisma: PrismaService) {}

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) throw new BadRequestException("Cannot follow yourself");

    const target = await this.prisma.user.findUnique({
      where: { id: followingId },
      select: { id: true, isPrivate: true },
    });
    if (!target) throw new NotFoundException("User not found");

    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (existing) throw new ConflictException("Already following");

    const status = target.isPrivate ? "PENDING" : "ACCEPTED";
    const follow = await this.prisma.follow.create({
      data: { followerId, followingId, status },
    });

    if (status === "ACCEPTED") {
      await this.prisma.user.update({
        where: { id: followingId },
        data: { followerCount: { increment: 1 } },
      });
    }

    return { followingId, status };
  }

  async unfollow(followerId: string, followingId: string) {
    const follow = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (!follow) throw new NotFoundException("Not following this user");

    await this.prisma.follow.delete({
      where: { followerId_followingId: { followerId, followingId } },
    });

    if (follow.status === "ACCEPTED") {
      await this.prisma.user.update({
        where: { id: followingId },
        data: { followerCount: { decrement: 1 } },
      });
    }
  }

  async getSuggestions(userId: string, limit = 10) {
    // Users followed by people you follow — simple 1-hop recommendation
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId, status: "ACCEPTED" },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);

    const candidateFollows = await this.prisma.follow.findMany({
      where: {
        followerId: { in: followingIds },
        followingId: { not: userId, notIn: [...followingIds, userId] },
        status: "ACCEPTED",
      },
      select: {
        followingId: true,
        following: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true },
        },
      },
      distinct: ["followingId"],
      take: limit,
    });

    return candidateFollows.map((cf) => ({
      ...cf.following,
      mutualFollowers: 1, // simplified
      reason: "Followed by someone you follow",
    }));
  }

  async isFollowing(followerId: string, followingId: string) {
    const follow = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    return { isFollowing: follow?.status === "ACCEPTED" ?? false };
  }
}
