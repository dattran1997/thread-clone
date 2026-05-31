import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ModerationService } from "./moderation.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Role } from "@prisma/client";
import { CreateReportDto } from "./dto/moderation.dto";

@ApiTags("moderation")
@ApiBearerAuth()
@Controller()
export class ModerationController {
  constructor(private moderationService: ModerationService) {}

  @Post("users/:id/block")
  @ApiOperation({ summary: "Block a user" })
  blockUser(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.moderationService.blockUser(user.id, id);
  }

  @Delete("users/:id/block")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Unblock a user" })
  unblockUser(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.moderationService.unblockUser(user.id, id);
  }

  @Post("users/:id/mute")
  @ApiOperation({ summary: "Mute a user" })
  muteUser(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.moderationService.muteUser(user.id, id);
  }

  @Delete("users/:id/mute")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Unmute a user" })
  unmuteUser(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.moderationService.unmuteUser(user.id, id);
  }

  @Get("users/me/blocks")
  @ApiOperation({ summary: "List blocked users" })
  getBlocks(@CurrentUser() user: { id: string }) {
    return this.moderationService.getBlocks(user.id);
  }

  @Post("reports")
  @ApiOperation({ summary: "Create a report" })
  createReport(@CurrentUser() user: { id: string }, @Body() dto: CreateReportDto) {
    return this.moderationService.createReport(user.id, dto);
  }

  @Get("reports")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "List reports (admin only)" })
  getReports(
    @Query("cursor") cursor?: string,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.moderationService.getReports(cursor, limit);
  }
}
