import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

interface CreateNotificationData {
  recipientId: string;
  actorId: string;
  type: string;
  entityId: string;
  entityType: string;
  preview?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateNotificationData) {
    return this.prisma.notification.create({
      data: {
        recipientId: data.recipientId,
        actorId: data.actorId,
        type: data.type as any,
        entityId: data.entityId,
        entityType: data.entityType,
        ...(data.preview && { preview: data.preview }),
      },
      include: {
        actor: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });
  }

  async findAll(userId: string, cursor?: string, limit = 20) {
    const items = await this.prisma.notification.findMany({
      where: { recipientId: userId },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: "desc" },
      include: {
        actor: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
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

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException("Notification not found");
    if (notification.recipientId !== userId) throw new ForbiddenException();

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { recipientId: userId, readAt: null },
    });
    return { count };
  }
}
