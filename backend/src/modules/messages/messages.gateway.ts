import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
import { MessagesService } from "./messages.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";

@WebSocketGateway({ cors: { origin: "*" }, namespace: "/messages" })
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagesGateway.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private messagesService: MessagesService,
    private notificationsGateway: NotificationsGateway,
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
      socket.data.userId = payload.sub as string;
      this.logger.log(`Messages: user ${socket.data.userId} connected`);
    } catch {
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    this.logger.log(`Messages: socket ${socket.id} disconnected`);
  }

  @SubscribeMessage("join-conversation")
  async handleJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = socket.data.userId as string;
    const participants = await this.messagesService.getConversationParticipants(data.conversationId);
    if (!participants.includes(userId)) {
      socket.emit("error", { message: "Not a participant in this conversation" });
      return;
    }
    await socket.join(`conv:${data.conversationId}`);
    socket.emit("joined", { conversationId: data.conversationId });
  }

  /** Called by the controller after an HTTP DELETE to broadcast deletion to the room */
  emitMessageDeleted(conversationId: string, messageId: string) {
    this.server.to(`conv:${conversationId}`).emit("message-deleted", { messageId, conversationId });
  }

  @SubscribeMessage("send-message")
  async handleSendMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: string; text: string },
  ) {
    const senderId = socket.data.userId as string;
    if (!data.conversationId || !data.text?.trim()) {
      socket.emit("error", { message: "conversationId and text are required" });
      return;
    }

    try {
      const message = await this.messagesService.sendMessage(
        data.conversationId,
        senderId,
        data.text,
      );

      // Broadcast to anyone in the conversation socket room (real-time chat view)
      this.server.to(`conv:${data.conversationId}`).emit("new-message", message);

      // Notify each other participant via the notifications namespace so the
      // unread badge updates even when they're not on the messages page
      const participants = await this.messagesService.getConversationParticipants(data.conversationId);
      for (const participantId of participants) {
        if (participantId !== senderId) {
          this.notificationsGateway.emitNewDm(participantId, {
            conversationId: data.conversationId,
            senderId,
            text: data.text,
          });
        }
      }
    } catch (err) {
      socket.emit("error", { message: (err as Error).message });
    }
  }
}
