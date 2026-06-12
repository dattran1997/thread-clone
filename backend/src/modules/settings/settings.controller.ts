import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { SettingsService } from "./settings.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UpdateSettingsDto, ChangePasswordDto, ChangeEmailDto, AddHiddenWordDto } from "./dto/settings.dto";

@ApiTags("settings")
@ApiBearerAuth()
@Controller("settings")
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: "Get current user settings" })
  getSettings(@CurrentUser() user: { id: string }) {
    return this.settingsService.getSettings(user.id);
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update user settings" })
  updateSettings(@CurrentUser() user: { id: string }, @Body() dto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(user.id, dto);
  }

  @Patch("password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Change password" })
  changePassword(@CurrentUser() user: { id: string }, @Body() dto: ChangePasswordDto) {
    return this.settingsService.changePassword(user.id, dto);
  }

  @Patch("email")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Change email" })
  changeEmail(@CurrentUser() user: { id: string }, @Body() dto: ChangeEmailDto) {
    return this.settingsService.changeEmail(user.id, dto);
  }

  @Get("hidden-words")
  @ApiOperation({ summary: "Get user's hidden word list" })
  getHiddenWords(@CurrentUser() user: { id: string }) {
    return this.settingsService.getHiddenWords(user.id);
  }

  @Post("hidden-words")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Add a word to hidden list" })
  addHiddenWord(@CurrentUser() user: { id: string }, @Body() dto: AddHiddenWordDto) {
    return this.settingsService.addHiddenWord(user.id, dto.word);
  }

  @Delete("hidden-words/:word")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove a word from hidden list" })
  removeHiddenWord(@CurrentUser() user: { id: string }, @Param("word") word: string) {
    return this.settingsService.removeHiddenWord(user.id, word);
  }

  // ── Sessions (Login Activity) ──────────────────────────────────────────────

  @Get("sessions")
  @ApiOperation({ summary: "List active sessions" })
  getSessions(@CurrentUser() user: { id: string; sid?: string }) {
    return this.settingsService.getSessions(user.id, user.sid);
  }

  @Delete("sessions/:sessionId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Revoke a specific session" })
  revokeSession(
    @CurrentUser() user: { id: string },
    @Param("sessionId") sessionId: string,
  ) {
    return this.settingsService.revokeSession(user.id, sessionId);
  }

  @Delete("sessions")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Sign out all other sessions" })
  revokeAllOtherSessions(@CurrentUser() user: { id: string; sid?: string }) {
    return this.settingsService.revokeAllOtherSessions(user.id, user.sid);
  }
}
