import {
  Controller, Post, Delete, Get, Param, UseGuards, HttpCode, HttpStatus, Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { FollowsService } from "./follows.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("follows")
@Controller("users")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FollowsController {
  constructor(private followsService: FollowsService) {}

  @Post(":id/follow")
  @ApiOperation({ summary: "Follow a user" })
  follow(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.followsService.follow(user.id, id);
  }

  @Delete(":id/follow")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Unfollow a user" })
  unfollow(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.followsService.unfollow(user.id, id);
  }

  @Get("suggestions")
  @ApiOperation({ summary: "Get follow suggestions" })
  getSuggestions(
    @CurrentUser() user: { id: string },
    @Query("limit") limit?: number,
  ) {
    return this.followsService.getSuggestions(user.id, limit);
  }
}
