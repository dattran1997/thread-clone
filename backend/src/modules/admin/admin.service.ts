import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateReportDto } from "./dto/admin.dto";

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async listUsers(q?: string, cursor?: string, limit = 20) {
    const items = await this.prisma.user.findMany({
      where: q
        ? {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { displayName: { contains: q, mode: "insensitive" } },
            ],
            deletedAt: null,
          }
        : { deletedAt: null },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        role: true,
        isVerified: true,
        createdAt: true,
        deletedAt: true,
      },
    });

    const hasMore = items.length > limit;
    const data = items.slice(0, limit);
    return {
      data,
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    };
  }

  async suspendUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException("User not found");

    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, username: true, deletedAt: true },
    });
  }

  async unsuspendUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException("User not found");

    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: null },
      select: { id: true, username: true, deletedAt: true },
    });
  }

  async listReports(cursor?: string, limit = 20) {
    const items = await this.prisma.report.findMany({
      where: { status: "PENDING" as any },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: "desc" },
      include: {
        reporter: { select: { id: true, username: true } },
      },
    });

    const hasMore = items.length > limit;
    const data = items.slice(0, limit);
    return {
      data,
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    };
  }

  async updateReport(id: string, dto: UpdateReportDto) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException("Report not found");

    return this.prisma.report.update({
      where: { id },
      data: { status: dto.status as any },
    });
  }

  async getStats() {
    const [userCount, threadCount, reportCount] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.thread.count({ where: { status: "ACTIVE" } }),
      this.prisma.report.count({ where: { status: "PENDING" as any } }),
    ]);
    return { userCount, threadCount, reportCount };
  }
}
