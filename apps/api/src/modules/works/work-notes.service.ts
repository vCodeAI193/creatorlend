import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/** Persönliche Notizen zu Werken (F-126). */
@Injectable()
export class WorkNotesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(userId: string, workId: string, body: string) {
    return this.prisma.workNote.upsert({
      where: { userId_workId: { userId, workId } },
      create: { userId, workId, body },
      update: { body },
    });
  }

  async get(userId: string, workId: string) {
    return this.prisma.workNote.findUnique({
      where: { userId_workId: { userId, workId } },
    });
  }

  async list(userId: string) {
    return this.prisma.workNote.findMany({
      where: { userId },
      include: { work: { select: { id: true, title: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }

  async remove(userId: string, workId: string) {
    await this.prisma.workNote.deleteMany({ where: { userId, workId } });
    return { deleted: true };
  }
}
