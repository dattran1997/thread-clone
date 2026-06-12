import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
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

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        displayName: dto.displayName,
        passwordHash,
        emailVerificationToken,
        emailVerificationExpires,
      },
    });

    // Send verification email (logs to console in dev)
    await this.sendVerificationEmail(user.email, emailVerificationToken);

    // Return tokens so the user is logged in immediately, but emailVerified = false
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

  // ── Verify Email ───────────────────────────────────────────────────────────
  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: { gt: new Date() },
      },
    });

    if (!user) throw new BadRequestException("Invalid or expired verification link");
    if (user.emailVerified) return { message: "Email already verified" };

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    return { message: "Email verified successfully" };
  }

  // ── Resend Verification ────────────────────────────────────────────────────
  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return OK to prevent email enumeration
    if (!user || user.emailVerified) {
      return { message: "If this email exists and is unverified, a new link has been sent" };
    }

    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationToken, emailVerificationExpires },
    });

    await this.sendVerificationEmail(email, emailVerificationToken);

    return { message: "If this email exists and is unverified, a new link has been sent" };
  }

  // ── OAuth: find or create user from Google profile ────────────────────────
  async findOrCreateOAuthUser(profile: {
    googleId: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
  }) {
    // Try to find by email first
    let user = await this.prisma.user.findUnique({ where: { email: profile.email } });

    if (!user) {
      // Auto-generate a username from the display name
      const baseUsername = profile.displayName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .slice(0, 25);

      let username = baseUsername;
      let attempt = 0;
      while (await this.prisma.user.findUnique({ where: { username } })) {
        attempt++;
        username = `${baseUsername}_${attempt}`;
      }

      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          username,
          displayName: profile.displayName,
          passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12), // unusable password
          avatarUrl: profile.avatarUrl ?? null,
          emailVerified: true, // Google already verified the email
        },
      });
    } else if (!user.emailVerified) {
      // Google verified their email — mark it as verified
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });
      user = { ...user, emailVerified: true };
    }

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

    // Validate the specific token hash (security fix: was looking up any session for user)
    const tokenHash = this.hashToken(rawRefreshToken);
    const session = await this.prisma.session.findFirst({
      where: {
        userId: payload.sub,
        refreshTokenHash: tokenHash,
        expiresAt: { gt: new Date() },
      },
    });
    if (!session) throw new UnauthorizedException("Session expired");

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });
    const tokens = await this.issueTokens(user.id, user.email, user.username, user.role);

    // Rotate: delete old session, save new one
    await this.prisma.session.delete({ where: { id: session.id } });
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  async logout(userId: string) {
    await this.prisma.session.deleteMany({ where: { userId } });
  }

  // ── Email sender (logs to console in dev, real email in prod) ─────────────
  private async sendVerificationEmail(email: string, token: string) {
    const frontendUrl = this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000";
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

    // Dev mode: log to console (no SMTP needed)
    if (this.config.get<string>("NODE_ENV") !== "production") {
      console.log("\n╔══════════════════════════════════════════════════════════╗");
      console.log("║  [DEV] EMAIL VERIFICATION                               ║");
      console.log("╠══════════════════════════════════════════════════════════╣");
      console.log(`║  To: ${email.padEnd(52)}║`);
      console.log("║  Open this URL in your browser to verify:               ║");
      console.log(`║  ${verifyUrl.slice(0, 56).padEnd(56)}║`);
      if (verifyUrl.length > 56) {
        console.log(`║  ${verifyUrl.slice(56, 112).padEnd(56)}║`);
      }
      console.log("╚══════════════════════════════════════════════════════════╝\n");
      return;
    }

    // Production: use nodemailer if SMTP_USER is set
    const smtpUser = this.config.get<string>("SMTP_USER");
    if (!smtpUser) {
      console.warn("[AUTH] SMTP not configured — skipping email for:", email);
      return;
    }

    // Dynamically import nodemailer to keep it optional
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
        host: this.config.get<string>("SMTP_HOST"),
        port: Number(this.config.get<string>("SMTP_PORT") ?? "587"),
        auth: {
          user: smtpUser,
          pass: this.config.get<string>("SMTP_PASS"),
        },
      });

      await transporter.sendMail({
        from: this.config.get<string>("EMAIL_FROM") ?? "noreply@threads-clone.local",
        to: email,
        subject: "Verify your email — Threads",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>Verify your email</h2>
            <p>Click the button below to verify your email address:</p>
            <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">
              Verify email
            </a>
            <p style="color:#666;font-size:13px;margin-top:24px;">
              This link expires in 24 hours. If you didn't create an account, ignore this email.
            </p>
          </div>
        `,
      });
    } catch (err) {
      console.error("[AUTH] Failed to send verification email:", err);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

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
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30d
    await this.prisma.session.create({ data: { userId, refreshTokenHash: tokenHash, expiresAt } });
  }

  private publicUser(user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    role: string;
    emailVerified: boolean;
  }) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      emailVerified: user.emailVerified,
    };
  }
}
