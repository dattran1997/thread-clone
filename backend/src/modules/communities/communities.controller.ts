import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { CommunitiesService } from "./communities.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { CreateCommunityDto } from "./dto/communities.dto";

@ApiTags("communities")
@Controller("communities")
export class CommunitiesController {
  constructor(private communitiesService: CommunitiesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "List all communities" })
  findAll(
    @Query("cursor") cursor?: string,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.communitiesService.findAll(cursor, limit);
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Get a community by ID" })
  findOne(@Param("id") id: string) {
    return this.communitiesService.findById(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a community" })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateCommunityDto) {
    return this.communitiesService.create(user.id, dto);
  }

  @Post(":id/join")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Join a community" })
  join(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.communitiesService.join(id, user.id);
  }

  @Delete(":id/leave")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Leave a community" })
  leave(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.communitiesService.leave(id, user.id);
  }

  @Get(":id/members")
  @Public()
  @ApiOperation({ summary: "List community members" })
  getMembers(
    @Param("id") id: string,
    @Query("cursor") cursor?: string,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.communitiesService.getMembers(id, cursor, limit);
  }
}
