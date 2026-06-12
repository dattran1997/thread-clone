import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../prisma/prisma.service";

export interface JwtPayload {
  sub: string;      // userId
  email: string;
  username: string;
  role: string;
  sid?: string;     // session ID — present in access tokens issued after sprint 5
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("jwt.accessSecret")!,
    });
  }

  async validate(payload: JwtPayload) {
    // If the token carries a session ID, verify the session still exists.
    // This is what makes "revoke session" actually block the device immediately.
    if (payload.sid) {
      const session = await this.prisma.session.findUnique({
        where: { id: payload.sid },
        select: { id: true },
      });
      if (!session) throw new UnauthorizedException("Session revoked");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, username: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) throw new UnauthorizedException();

    // Include sid so controllers/services can identify the caller's session
    return { ...user, sid: payload.sid };
  }
}
