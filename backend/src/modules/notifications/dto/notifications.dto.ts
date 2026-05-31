import { IsString, IsOptional, IsEnum } from "class-validator";

export enum NotificationTypeEnum {
  LIKE = "LIKE",
  FOLLOW = "FOLLOW",
  REPLY = "REPLY",
  REPOST = "REPOST",
  QUOTE = "QUOTE",
  MENTION = "MENTION",
}

export class CreateNotificationDto {
  @IsString()
  recipientId: string;

  @IsString()
  actorId: string;

  @IsEnum(NotificationTypeEnum)
  type: NotificationTypeEnum;

  @IsString()
  entityId: string;

  @IsString()
  entityType: string;

  @IsOptional()
  @IsString()
  preview?: string;
}
