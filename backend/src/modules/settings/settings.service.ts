import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateSettingsDto, ChangePasswordDto, ChangeEmailDto } from "./dto/settings.dto";

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isPrivate: true,
        email: true,
        username: true,
        displayName: true,
      },
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.isPrivate !== undefined && { isPrivate: dto.isPrivate }),
      },
      select: {
        id: true,
        isPrivate: true,
        email: true,
        username: true,
      },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) throw new NotFoundException("User not found");

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException("Current password is incorrect");

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { success: true };
  }

  async getHiddenWords(userId: string): Promise<{ words: string[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { hiddenWords: true },
    });
    return { words: user?.hiddenWords ?? [] };
  }

  async addHiddenWord(userId: string, word: string): Promise<{ words: string[] }> {
    const w = word.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { hiddenWords: true } });
    const current = user?.hiddenWords ?? [];
    if (current.includes(w)) return { words: current };
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { hiddenWords: { push: w } },
      select: { hiddenWords: true },
    });
    return { words: updated.hiddenWords };
  }

  async removeHiddenWord(userId: string, word: string): Promise<{ words: string[] }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { hiddenWords: true } });
    const filtered = (user?.hiddenWords ?? []).filter((w) => w !== word);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { hiddenWords: filtered },
      select: { hiddenWords: true },
    });
    return { words: updated.hiddenWords };
  }

  // ── Sessions (Login Activity) ──────────────────────────────────────────────
  async getSessions(userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: { id: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    });
    return { sessions };
  }

  async revokeSession(userId: string, sessionId: string) {
    // Only allow revoking own sessions
    await this.prisma.session.deleteMany({
      where: { id: sessionId, userId },
    });
    return { success: true };
  }

  async revokeAllOtherSessions(userId: string, currentSessionId?: string) {
    await this.prisma.session.deleteMany({
      where: {
        userId,
        ...(currentSessionId ? { id: { not: currentSessionId } } : {}),
      },
    });
    return { success: true };
  }

  async changeEmail(userId: string, dto: ChangeEmailDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) throw new NotFoundException("User not found");

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new BadRequestException("Password is incorrect");

    const emailTaken = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (emailTaken && emailTaken.id !== userId) {
      throw new ConflictException("Email already in use");
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { email: dto.email, emailVerified: false },
      select: { id: true, email: true },
    });
  }
}
