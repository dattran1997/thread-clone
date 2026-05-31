import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { MessagesService } from "./messages.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SendMessageDto, StartConversationDto } from "./dto/messages.dto";

@ApiTags("messages")
@ApiBearerAuth()
@Controller("messages")
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get()
  @ApiOperation({ summary: "List DM conversations for current user" })
  getConversations(
    @CurrentUser() user: { id: string },
    @Query("cursor") cursor?: string,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.messagesService.getConversations(user.id, cursor, limit);
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
}
