import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ── Register ───────────────────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const [emailTaken, usernameTaken] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: dto.email } }),
      this.prisma.user.findUnique({ where: { username: dto.username } }),
    ]);
    if (emailTaken) throw new ConflictException("Email already in use");
    if (usernameTaken) throw new ConflictException("Username already taken");

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        displayName: dto.displayName,
        passwordHash,
      },
    });

    const tokens = await this.issueTokens(user.id, user.email, user.username, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return { user: this.publicUser(user), ...tokens };
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.isActive) throw new UnauthorizedException("Invalid credentials");

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid credentials");

    const tokens = await this.issueTokens(user.id, user.email, user.username, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return { user: this.publicUser(user), ...tokens };
  }

  // ── Refresh ────────────────────────────────────────────────────────────────
  async refresh(rawRefreshToken: string) {
    let payload: { sub: string };
    try {
      payload = this.jwt.verify(rawRefreshToken, {
        secret: this.config.get<string>("jwt.refreshSecret"),
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const tokenHash = await bcrypt.hash(rawRefreshToken, 1); // cheap hash for lookup
    const session = await this.prisma.session.findFirst({
      where: { userId: payload.sub, expiresAt: { gt: new Date() } },
    });
    if (!session) throw new UnauthorizedException("Session expired");

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });
    const tokens = await this.issueTokens(user.id, user.email, user.username, user.role);

    // rotate: delete old session, save new one
    await this.prisma.session.delete({ where: { id: session.id } });
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  async logout(userId: string) {
    await this.prisma.session.deleteMany({ where: { userId } });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private async issueTokens(
    sub: string,
    email: string,
    username: string,
    role: string,
  ) {
    const payload = { sub, email, username, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>("jwt.accessSecret"),
        expiresIn: (this.config.get<string>("jwt.accessExpiresIn") ?? "15m") as any,
      }),
      this.jwt.signAsync({ sub }, {
        secret: this.config.get<string>("jwt.refreshSecret"),
        expiresIn: (this.config.get<string>("jwt.refreshExpiresIn") ?? "30d") as any,
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, token: string) {
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30d
    await this.prisma.session.create({ data: { userId, refreshTokenHash: tokenHash, expiresAt } });
  }

  private publicUser(user: { id: string; username: string; displayName: string; avatarUrl: string | null; role: string }) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
    };
  }
}
