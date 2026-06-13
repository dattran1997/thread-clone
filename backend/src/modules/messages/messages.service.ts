import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async getConversations(userId: string, cursor?: string, limit = 20) {
    const participants = await this.prisma.dmParticipant.findMany({
      where: { userId },
      take: limit + 1,
      ...(cursor && {
        cursor: { conversationId_userId: { conversationId: cursor, userId } },
        skip: 1,
      }),
      orderBy: { conversation: { updatedAt: "desc" } },
      include: {
        conversation: {
          include: {
            participants: {
              where: { userId: { not: userId } },
              include: {
                user: {
                  select: { id: true, username: true, displayName: true, avatarUrl: true },
                },
              },
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { id: true, text: true, senderId: true, createdAt: true },
            },
          },
        },
      },
    });

    const hasMore = participants.length > limit;
    const data = participants.slice(0, limit).map((p: typeof participants[number]) => ({
      conversationId: p.conversationId,
      unreadCount: p.unreadCount,
      lastMessage: p.conversation.messages[0] ?? null,
      participant: p.conversation.participants[0]?.user ?? null,
      updatedAt: p.conversation.updatedAt,
    }));

    return {
      data,
      nextCursor: hasMore ? data[data.length - 1].conversationId : null,
      hasMore,
    };
  }

  async getMessages(conversationId: string, userId: string, cursor?: string, limit = 20) {
    const participant = await this.prisma.dmParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new ForbiddenException("Not a participant in this conversation");

    // Reset unread count
    await this.prisma.dmParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { unreadCount: 0 },
    });

    const items = await this.prisma.dmMessage.findMany({
      where: { conversationId },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
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

  async sendMessage(conversationId: string, senderId: string, text: string) {
    const participant = await this.prisma.dmParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: senderId } },
    });
    if (!participant) throw new ForbiddenException("Not a participant in this conversation");

    const message = await this.prisma.dmMessage.create({
      data: { conversationId, senderId, text },
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    // Increment unread count for all other participants
    await this.prisma.dmParticipant.updateMany({
      where: { conversationId, userId: { not: senderId } },
      data: { unreadCount: { increment: 1 } },
    });

    // Update conversation updatedAt
    await this.prisma.dmConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async startConversation(userId: string, recipientId: string) {
    // Find a conversation where BOTH users are participants (and no one else)
    const existing = await this.prisma.dmConversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: recipientId } } },
          // Exclude conversations that have participants outside these two users
          { participants: { none: { userId: { notIn: [userId, recipientId] } } } },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (existing) return existing;

    // Ensure recipient exists
    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true },
    });
    if (!recipient) throw new NotFoundException("Recipient not found");

    return this.prisma.dmConversation.create({
      data: {
        participants: {
          create: [{ userId }, { userId: recipientId }],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
          },
        },
      },
    });
  }

  // ── Total unread DM count across all conversations ────────────────────────
  async getUnreadTotal(userId: string) {
    const result = await this.prisma.dmParticipant.aggregate({
      where: { userId },
      _sum: { unreadCount: true },
    });
    return { count: result._sum.unreadCount ?? 0 };
  }

  async getConversationParticipants(conversationId: string): Promise<string[]> {
    const participants = await this.prisma.dmParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    return participants.map((p: { userId: string }) => p.userId);
  }

  // ── Delete conversation (removes user's participant record; cleans up if empty) ─
  async deleteConversation(conversationId: string, userId: string) {
    const participant = await this.prisma.dmParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new ForbiddenException("Not a participant in this conversation");

    // Remove the user's participant record
    await this.prisma.dmParticipant.delete({
      where: { conversationId_userId: { conversationId, userId } },
    });

    // If no participants remain, delete the entire conversation (cascades to messages)
    const remaining = await this.prisma.dmParticipant.count({ where: { conversationId } });
    if (remaining === 0) {
      await this.prisma.dmConversation.delete({ where: { id: conversationId } }).catch(() => {});
    }

    return { success: true };
  }

  // ── Soft-delete (unsend) a message — sender only ──────────────────────────
  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.dmMessage.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, conversationId: true, isDeleted: true },
    });
    if (!message) throw new NotFoundException("Message not found");
    if (message.senderId !== userId) {
      throw new ForbiddenException("You can only unsend your own messages");
    }
    if (message.isDeleted) return { conversationId: message.conversationId, messageId, success: true };

    await this.prisma.dmMessage.update({
      where: { id: messageId },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return { conversationId: message.conversationId, messageId, success: true };
  }
}
