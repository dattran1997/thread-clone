import {
  Controller, Post, Delete, Get, Param, Body, UseGuards, HttpCode, HttpStatus, Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ReactionsService } from "./reactions.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { IsString, MaxLength } from "class-validator";

class QuoteDto {
  @IsString()
  @MaxLength(500)
  quoteText: string;
}

@ApiTags("reactions")
@Controller("threads/:id")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReactionsController {
  constructor(private reactionsService: ReactionsService) {}

  @Post("like")
  @ApiOperation({ summary: "Like a thread" })
  like(@CurrentUser() u: { id: string }, @Param("id") id: string) {
    return this.reactionsService.like(id, u.id);
  }

  @Delete("like")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Unlike a thread" })
  unlike(@CurrentUser() u: { id: string }, @Param("id") id: string) {
    return this.reactionsService.unlike(id, u.id);
  }

  @Post("repost")
  @ApiOperation({ summary: "Repost a thread" })
  repost(@CurrentUser() u: { id: string }, @Param("id") id: string) {
    return this.reactionsService.repost(id, u.id);
  }

  @Delete("repost")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove repost" })
  unrepost(@CurrentUser() u: { id: string }, @Param("id") id: string) {
    return this.reactionsService.unrepost(id, u.id);
  }

  @Post("save")
  @ApiOperation({ summary: "Save/bookmark a thread" })
  save(@CurrentUser() u: { id: string }, @Param("id") id: string) {
    return this.reactionsService.save(id, u.id);
  }

  @Delete("save")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove saved thread" })
  unsave(@CurrentUser() u: { id: string }, @Param("id") id: string) {
    return this.reactionsService.unsave(id, u.id);
  }

  @Post("quote")
  @ApiOperation({ summary: "Quote a thread with text" })
  quote(
    @CurrentUser() u: { id: string },
    @Param("id") id: string,
    @Body() dto: QuoteDto,
  ) {
    return this.reactionsService.quote(id, u.id, dto.quoteText);
  }

  @Get("likes")
  @ApiOperation({ summary: "Get users who liked this thread" })
  getLikes(
    @Param("id") id: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: number,
  ) {
    return this.reactionsService.getLikes(id, cursor, limit);
  }
}
