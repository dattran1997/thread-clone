import { IsString, IsOptional, IsEnum } from "class-validator";
import { NotificationType } from "@prisma/client";

export class CreateNotificationDto {
  @IsString()
  recipientId: string;

  @IsString()
  actorId: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  entityId: string;

  @IsString()
  entityType: string;

  @IsOptional()
  @IsString()
  preview?: string;
}
