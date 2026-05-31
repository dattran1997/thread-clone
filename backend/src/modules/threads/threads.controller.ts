import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { ThreadsService } from "./threads.service";
import { CreateThreadDto } from "./dto/create-thread.dto";
import { UpdateThreadDto } from "./dto/update-thread.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("threads")
@Controller("threads")
@UseGuards(JwtAuthGuard)
export class ThreadsController {
  constructor(private threadsService: ThreadsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a thread" })
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateThreadDto,
  ) {
    return this.threadsService.create(user.id, dto);
  }

  @Public()
  @Get(":id")
  @ApiOperation({ summary: "Get thread by ID" })
  findOne(
    @Param("id") id: string,
    @CurrentUser() user?: { id: string },
  ) {
    return this.threadsService.findOne(id, user?.id);
  }

  @Public()
  @Get(":id/replies")
  @ApiOperation({ summary: "Get thread with its replies" })
  @ApiQuery({ name: "cursor", required: false })
  @ApiQuery({ name: "limit", required: false })
  findWithReplies(
    @Param("id") id: string,
    @CurrentUser() user: { id: string } | undefined,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: number,
  ) {
    return this.threadsService.findWithReplies(id, user?.id, cursor, limit);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Edit thread (within 15 min)" })
  update(
    @Param("id") id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateThreadDto,
  ) {
    return this.threadsService.update(id, user.id, dto);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete own thread (soft delete)" })
  delete(
    @Param("id") id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.threadsService.delete(id, user.id);
  }

  @Post(":id/poll/vote")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Vote on a poll option" })
  votePoll(
    @Param("id") id: string,
    @CurrentUser() user: { id: string },
    @Body("optionId") optionId: string,
  ) {
    return this.threadsService.votePoll(id, user.id, optionId);
  }
}
