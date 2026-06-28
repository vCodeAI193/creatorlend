import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

interface CreateReportInput {
  targetType: string;
  targetId: string;
  reason: string;
  description?: string;
}

const PAGE_SIZE = 20;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(reporterId: string, input: CreateReportInput) {
    return this.prisma.report.create({
      data: {
        reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        description: input.description,
        status: "OPEN",
      },
    });
  }

  async list(page = 1, status?: string) {
    const where = status ? { status } : {};
    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (Math.max(page, 1) - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.report.count({ where }),
    ]);
    return { reports, meta: { page, pageSize: PAGE_SIZE, total } };
  }

  async review(adminId: string, reportId: string, action: "REVIEWED" | "DISMISSED") {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException("report_not_found");
    if (report.status !== "OPEN") throw new BadRequestException("report_already_reviewed");
    return this.prisma.report.update({
      where: { id: reportId },
      data: { status: action, reviewedAt: new Date() },
    });
  }
}
