import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { ThreadsService } from "./threads.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("threads")
@Controller("threads/user")
@UseGuards(JwtAuthGuard)
export class UserThreadsController {
  constructor(private threadsService: ThreadsService) {}

  @Public()
  @Get(":userId")
  @ApiOperation({ summary: "Get threads by user (posts/replies/reposts)" })
  @ApiQuery({ name: "type", enum: ["posts", "replies", "reposts"], required: false })
  @ApiQuery({ name: "cursor", required: false })
  @ApiQuery({ name: "limit", required: false })
  findByUser(
    @Param("userId") userId: string,
    @CurrentUser() viewer?: { id: string },
    @Query("type") type: "posts" | "replies" | "reposts" = "posts",
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: number,
  ) {
    return this.threadsService.findByUser(userId, viewer?.id, type, cursor, limit);
  }
}
