import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Role } from "@prisma/client";
import { UpdateReportDto } from "./dto/admin.dto";

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
@Controller("admin")
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get("users")
  @ApiOperation({ summary: "List users with optional search" })
  listUsers(
    @Query("q") q?: string,
    @Query("cursor") cursor?: string,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.adminService.listUsers(q, cursor, limit);
  }

  @Patch("users/:id/suspend")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Suspend a user" })
  suspendUser(@Param("id") id: string) {
    return this.adminService.suspendUser(id);
  }

  @Patch("users/:id/unsuspend")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Unsuspend a user" })
  unsuspendUser(@Param("id") id: string) {
    return this.adminService.unsuspendUser(id);
  }

  @Get("reports")
  @ApiOperation({ summary: "List pending reports" })
  listReports(
    @Query("cursor") cursor?: string,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.adminService.listReports(cursor, limit);
  }

  @Patch("reports/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update a report status" })
  updateReport(@Param("id") id: string, @Body() dto: UpdateReportDto) {
    return this.adminService.updateReport(id, dto);
  }

  @Get("stats")
  @ApiOperation({ summary: "Get platform statistics" })
  getStats() {
    return this.adminService.getStats();
  }
}
