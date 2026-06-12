import {
  IsString, IsOptional, IsBoolean, IsArray, ArrayMaxSize,
  MaxLength, IsDateString, IsUUID, ValidateNested, ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

class PollOptionDto {
  @IsString()
  @MaxLength(25)
  text: string;
}

class CreatePollDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => PollOptionDto)
  options: PollOptionDto[];

  @IsDateString()
  expiresAt: string;
}

export class CreateThreadDto {
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(500)
  text: string = "";

  @ApiPropertyOptional({ description: "Parent thread ID for replies" })
  @IsOptional()
  @IsString()   // cuid() IDs are not UUID format
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isGhost?: boolean;

  @ApiPropertyOptional({ enum: ["EVERYONE", "FOLLOWING", "MENTIONED"] })
  @IsOptional()
  @IsString()
  replyPermission?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireApproval?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;

  @ApiPropertyOptional({ type: [String], description: "Already-uploaded media IDs (max 20)" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  mediaIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePollDto)
  poll?: CreatePollDto;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topics?: string[];
}
