import { IsEnum, IsOptional, IsString } from "class-validator";

export enum AdminReportStatus {
  PENDING = "PENDING",
  REVIEWED = "REVIEWED",
  ACTION_TAKEN = "ACTION_TAKEN",
  DISMISSED = "DISMISSED",
}

export class UpdateReportDto {
  @IsEnum(AdminReportStatus)
  status: AdminReportStatus;

  @IsOptional()
  @IsString()
  action?: string;
}
