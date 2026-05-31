import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { FeedService } from "./feed.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("feed")
@Controller("feed")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FeedController {
  constructor(private feedService: FeedService) {}

  @Get("following")
  @ApiOperation({ summary: "Get following feed (reverse-chronological)" })
  @ApiQuery({ name: "cursor", required: false })
  @ApiQuery({ name: "limit", required: false })
  following(
    @CurrentUser() user: { id: string },
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: number,
  ) {
    return this.feedService.getFollowingFeed(user.id, cursor, limit);
  }

  @Get("for-you")
  @ApiOperation({ summary: "Get For You feed (algorithmic)" })
  @ApiQuery({ name: "cursor", required: false })
  @ApiQuery({ name: "limit", required: false })
  forYou(
    @CurrentUser() user: { id: string },
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: number,
  ) {
    return this.feedService.getForYouFeed(user.id, cursor, limit);
  }
}
