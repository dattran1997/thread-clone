import { IsString, IsNotEmpty, IsEnum, MaxLength, IsOptional } from "class-validator";

export enum ReportTargetType {
  THREAD = "THREAD",
  USER = "USER",
}

export class CreateReportDto {
  @IsEnum(ReportTargetType)
  targetType: ReportTargetType;

  @IsString()
  @IsNotEmpty()
  targetId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
