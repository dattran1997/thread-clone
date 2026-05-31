import {
  Controller,
  Get,
  Param,
  Query,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { AnalyticsService } from "./analytics.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

type ChartRange = "7d" | "30d" | "90d";
const VALID_RANGES: ChartRange[] = ["7d", "30d", "90d"];

@ApiTags("analytics")
@ApiBearerAuth()
@Controller("insights")
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get()
  @ApiOperation({ summary: "Get insights summary for current user" })
  getSummary(@CurrentUser() user: { id: string }) {
    return this.analyticsService.getSummary(user.id);
  }

  @Get("chart")
  @ApiOperation({ summary: "Get performance chart data" })
  @ApiQuery({ name: "range", enum: ["7d", "30d", "90d"] })
  getChart(
    @CurrentUser() user: { id: string },
    @Query("range") range?: string,
  ) {
    const r = (range ?? "7d") as ChartRange;
    if (!VALID_RANGES.includes(r)) {
      throw new BadRequestException("range must be one of: 7d, 30d, 90d");
    }
    return this.analyticsService.getChart(user.id, r);
  }

  @Get("threads/:threadId")
  @ApiOperation({ summary: "Get insight for a specific thread" })
  getThreadInsight(
    @CurrentUser() user: { id: string },
    @Param("threadId") threadId: string,
  ) {
    return this.analyticsService.getThreadInsight(threadId, user.id);
  }
}
