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

      socket.data.userId = userId;
      await socket.join(`user:${userId}`);
      this.logger.log(`Notifications: user ${userId} connected`);
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
}
