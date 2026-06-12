import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { MessagesService } from "./messages.service";
import { MessagesGateway } from "./messages.gateway";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SendMessageDto, StartConversationDto } from "./dto/messages.dto";

@ApiTags("messages")
@ApiBearerAuth()
@Controller("messages")
export class MessagesController {
  constructor(
    private messagesService: MessagesService,
    private messagesGateway: MessagesGateway,
  ) {}

  @Get()
  @ApiOperation({ summary: "List DM conversations for current user" })
  getConversations(
    @CurrentUser() user: { id: string },
    @Query("cursor") cursor?: string,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.messagesService.getConversations(user.id, cursor, limit);
  }

  @Get("unread-total")
  @ApiOperation({ summary: "Total unread DM count across all conversations" })
  getUnreadTotal(@CurrentUser() user: { id: string }) {
    return this.messagesService.getUnreadTotal(user.id);
  }

  @Post("start")
  @ApiOperation({ summary: "Start a new conversation" })
  startConversation(
    @CurrentUser() user: { id: string },
    @Body() dto: StartConversationDto,
  ) {
    return this.messagesService.startConversation(user.id, dto.recipientId);
  }

  @Get(":conversationId")
  @ApiOperation({ summary: "Get messages in a conversation (paginated)" })
  getMessages(
    @CurrentUser() user: { id: string },
    @Param("conversationId") conversationId: string,
    @Query("cursor") cursor?: string,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.messagesService.getMessages(conversationId, user.id, cursor, limit);
  }

  @Post(":conversationId")
  @ApiOperation({ summary: "Send a message in a conversation" })
  sendMessage(
    @CurrentUser() user: { id: string },
    @Param("conversationId") conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(conversationId, user.id, dto.text);
  }

  @Delete(":conversationId")
  @ApiOperation({ summary: "Delete a conversation (removes user from participants)" })
  deleteConversation(
    @CurrentUser() user: { id: string },
    @Param("conversationId") conversationId: string,
  ) {
    return this.messagesService.deleteConversation(conversationId, user.id);
  }

  @Delete(":conversationId/messages/:messageId")
  @ApiOperation({ summary: "Delete a message (sender only)" })
  async deleteMessage(
    @CurrentUser() user: { id: string },
    @Param("conversationId") conversationId: string,
    @Param("messageId") messageId: string,
  ) {
    const result = await this.messagesService.deleteMessage(messageId, user.id);
    // Broadcast deletion to all participants currently in the conversation room
    this.messagesGateway.emitMessageDeleted(conversationId, messageId);
    return result;
  }
}
