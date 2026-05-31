import {
  Controller, Get, Patch, Post, Delete,
  Param, Body, Query, UseGuards,
  UploadedFile, UseInterceptors, HttpCode, HttpStatus,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("users")
@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  // ── Own profile ────────────────────────────────────────────────────────────
  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get own profile" })
  getMe(@CurrentUser() user: { id: string }) {
    return this.usersService.findById(user.id);
  }

  @Patch("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update own profile" })
  updateMe(@CurrentUser() user: { id: string }, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Post("me/avatar")
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload avatar" })
  async uploadAvatar(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    // TODO: upload to MinIO in M11; for now return a placeholder
    const avatarUrl = `/media/${user.id}/avatar.webp`;
    return this.usersService.updateAvatar(user.id, avatarUrl);
  }

  @Delete("me")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Deactivate account (30-day grace)" })
  deactivate(@CurrentUser() user: { id: string }) {
    return this.usersService.deactivate(user.id);
  }

  // ── Username availability ──────────────────────────────────────────────────
  @Public()
  @Get("check-username")
  @ApiOperation({ summary: "Check if username is available" })
  @ApiQuery({ name: "username", required: true })
  checkUsername(@Query("username") username: string) {
    return this.usersService.checkUsernameAvailability(username);
  }

  // ── Public profile ─────────────────────────────────────────────────────────
  @Public()
  @Get(":username")
  @ApiOperation({ summary: "Get public profile by username" })
  getProfile(
    @Param("username") username: string,
    @CurrentUser() user?: { id: string },
  ) {
    return this.usersService.findByUsername(username, user?.id);
  }

  // ── Followers / Following ─────────────────────────────────────────────────
  @Get(":id/followers")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get followers list" })
  @ApiQuery({ name: "cursor", required: false })
  @ApiQuery({ name: "limit", required: false })
  getFollowers(
    @Param("id") id: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: number,
  ) {
    return this.usersService.getFollowers(id, cursor, limit);
  }

  @Get(":id/following")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get following list" })
  @ApiQuery({ name: "cursor", required: false })
  @ApiQuery({ name: "limit", required: false })
  getFollowing(
    @Param("id") id: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: number,
  ) {
    return this.usersService.getFollowing(id, cursor, limit);
  }
}
