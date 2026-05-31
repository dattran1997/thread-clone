import { IsString, IsOptional, MaxLength, IsArray, ArrayMaxSize, IsUrl } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: "Alice Smith" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @ApiPropertyOptional({ example: "Building cool things 🚀" })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  bio?: string;

  @ApiPropertyOptional({ example: "NYC" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  location?: string;

  @ApiPropertyOptional({ description: "Up to 5 profile links", type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsUrl({}, { each: true })
  links?: string[];

  @ApiPropertyOptional({ description: "Up to 10 topic tags", type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  topics?: string[];

  @ApiPropertyOptional({ description: "Short notes text displayed on profile image" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  notes?: string;
}
