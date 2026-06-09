import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { HashtagsService } from "./hashtags.service";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("hashtags")
@Controller("hashtags")
export class HashtagsController {
  constructor(private hashtagsService: HashtagsService) {}

  @Public()
  @Get("trending")
  @ApiOperation({ summary: "Get trending hashtags ordered by thread count" })
  @ApiQuery({ name: "limit", required: false, description: "Max results (default 10)" })
  getTrending(@Query("limit") limit?: string) {
    return this.hashtagsService.getTrending(limit ? parseInt(limit, 10) : 10);
  }
}
