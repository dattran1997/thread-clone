import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { SearchService } from "./search.service";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("search")
@Controller("search")
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get("trending")
  @Public()
  @ApiOperation({ summary: "Get top trending hashtags" })
  getTrending() {
    return this.searchService.getTrending();
  }

  @Get()
  @Public()
  @ApiOperation({ summary: "Search users, threads, or tags" })
  @ApiQuery({ name: "q", required: true })
  @ApiQuery({ name: "type", enum: ["users", "threads", "tags"] })
  @ApiQuery({ name: "cursor", required: false })
  @ApiQuery({ name: "limit", required: false })
  search(
    @Query("q") q: string,
    @Query("type") type: string,
    @CurrentUser() user?: { id: string },
    @Query("cursor") cursor?: string,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    if (!q || !q.trim()) {
      throw new BadRequestException("Query parameter q is required");
    }
    if (!["users", "threads", "tags"].includes(type)) {
      throw new BadRequestException("type must be one of: users, threads, tags");
    }
    return this.searchService.search(
      q.trim(),
      type as "users" | "threads" | "tags",
      user?.id,
      cursor,
      limit,
    );
  }
}
