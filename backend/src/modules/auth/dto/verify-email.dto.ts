import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class VerifyEmailDto {
  @ApiProperty({ example: "abc123def456..." })
  @IsString()
  token: string;
}
