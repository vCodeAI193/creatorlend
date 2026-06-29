import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

const STUDENT_DOMAINS = [".edu", ".ac.uk", ".edu.de", ".edu.au", ".edu.cn", ".ac.in"];

@Injectable()
export class StudentDiscountService {
  constructor(private readonly prisma: PrismaService) {}

  private isStudentEmail(email: string): boolean {
    return STUDENT_DOMAINS.some((domain) => email.toLowerCase().endsWith(domain));
  }

  async applyForDiscount(userId: string, eduEmail: string) {
    if (!this.isStudentEmail(eduEmail)) {
      throw new BadRequestException("invalid_edu_email");
    }
    const existing = await this.prisma.studentVerification.findUnique({ where: { userId } });
    if (existing && existing.status === "VERIFIED") {
      throw new BadRequestException("already_verified_student");
    }
    return this.prisma.studentVerification.upsert({
      where: { userId },
      create: { userId, eduEmail, status: "PENDING" },
      update: { eduEmail, status: "PENDING", verifiedAt: null, expiresAt: null },
    });
  }

  async verifyStudent(userId: string, token: string) {
    const record = await this.prisma.studentVerification.findUnique({ where: { userId } });
    if (!record) throw new NotFoundException("student_verification_not_found");
    if (record.status === "VERIFIED") throw new BadRequestException("already_verified");
    if (!token) throw new BadRequestException("invalid_token");
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    return this.prisma.studentVerification.update({
      where: { userId },
      data: { status: "VERIFIED", verifiedAt: new Date(), expiresAt },
    });
  }

  async checkStudentStatus(userId: string) {
    const record = await this.prisma.studentVerification.findUnique({ where: { userId } });
    if (!record) return { status: "NONE" };
    if (record.status === "VERIFIED" && record.expiresAt && record.expiresAt < new Date()) {
      await this.prisma.studentVerification.update({ where: { userId }, data: { status: "EXPIRED" } });
      return { status: "EXPIRED", eduEmail: record.eduEmail };
    }
    return { status: record.status, eduEmail: record.eduEmail, expiresAt: record.expiresAt };
  }

  async revokeDiscount(userId: string) {
    const record = await this.prisma.studentVerification.findUnique({ where: { userId } });
    if (!record) throw new NotFoundException("student_verification_not_found");
    return this.prisma.studentVerification.update({
      where: { userId },
      data: { status: "EXPIRED", expiresAt: new Date() },
    });
  }
}
