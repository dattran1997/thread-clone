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
    // Check if a conversation already exists between the two users
    const existing = await this.prisma.dmConversation.findFirst({
      where: {
        participants: {
          every: { userId: { in: [userId, recipientId] } },
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

    if (existing) {
      // Verify both participants exist
      const participantIds = existing.participants.map((p: { userId: string }) => p.userId);
      if (participantIds.includes(userId) && participantIds.includes(recipientId)) {
        return existing;
      }
    }

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

  async getConversationParticipants(conversationId: string): Promise<string[]> {
    const participants = await this.prisma.dmParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    return participants.map((p: { userId: string }) => p.userId);
  }
}
