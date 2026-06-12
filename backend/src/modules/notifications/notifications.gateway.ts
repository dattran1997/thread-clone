import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";

@WebSocketGateway({ cors: { origin: "*" }, namespace: "/notifications" })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        socket.disconnect();
        return;
      }

      const secret = this.configService.get<string>("jwt.accessSecret");
      const payload = this.jwtService.verify(token, { secret });
      const userId = payload.sub as string;
      const sid = payload.sid as string | undefined;

      socket.data.userId = userId;
      socket.data.sid = sid;
      await socket.join(`user:${userId}`);
      // Also join a session-specific room so we can target exactly one device
      if (sid) await socket.join(`session:${sid}`);
      this.logger.log(`Notifications: user ${userId} (session ${sid ?? "legacy"}) connected`);
    } catch {
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    this.logger.log(`Notifications: socket ${socket.id} disconnected`);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  /** Emit an event to a single specific session (one device). */
  emitToSession(sessionId: string, event: string, payload: unknown) {
    this.server.to(`session:${sessionId}`).emit(event, payload);
  }

  /** Clients call this when they mount a PostCard so they receive live count updates */
  @SubscribeMessage("join-thread")
  async handleJoinThread(@MessageBody() threadId: string, @ConnectedSocket() socket: Socket) {
    await socket.join(`thread:${threadId}`);
  }

  @SubscribeMessage("leave-thread")
  async handleLeaveThread(@MessageBody() threadId: string, @ConnectedSocket() socket: Socket) {
    await socket.leave(`thread:${threadId}`);
  }

  /** Called by ReactionsService after a like/repost/reply count changes */
  emitThreadUpdate(threadId: string, payload: { likeCount?: number; repostCount?: number; replyCount?: number }) {
    this.server.to(`thread:${threadId}`).emit("thread-updated", { threadId, ...payload });
  }

  /** Called by ThreadsService when a reply is created — broadcasts the full reply to thread viewers */
  emitNewReply(threadId: string, reply: unknown) {
    this.server.to(`thread:${threadId}`).emit("new-reply", { threadId, reply });
  }

  /** Called by MessagesGateway when a DM is sent — notifies the recipient via the notifications socket */
  emitNewDm(recipientId: string, payload: { conversationId: string; senderId: string; text: string }) {
    this.server.to(`user:${recipientId}`).emit("new-dm", payload);
  }
}
