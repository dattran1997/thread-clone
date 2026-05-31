import {
  Controller,
  Get,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { SettingsService } from "./settings.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UpdateSettingsDto, ChangePasswordDto, ChangeEmailDto } from "./dto/settings.dto";

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
}
