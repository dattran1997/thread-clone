import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  MaxLength,
  MinLength,
} from "class-validator";

export class UpdateSettingsDto {
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @IsString()
  defaultReplyPermission?: string;

  @IsOptional()
  @IsBoolean()
  hideLikeCounts?: boolean;
}

export class AddHiddenWordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  word: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}

export class ChangeEmailDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
