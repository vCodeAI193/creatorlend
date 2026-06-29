import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/** Persönliche Lesezeichen (F-124). */
@Injectable()
export class BookmarksService {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: string, workId: string, positionSeconds: number, label?: string) {
    return this.prisma.bookmark.create({ data: { userId, workId, positionSeconds, label } });
  }

  async list(userId: string, workId?: string) {
    return this.prisma.bookmark.findMany({
      where: { userId, ...(workId ? { workId } : {}) },
      orderBy: { createdAt: "desc" },
      include: { work: { select: { id: true, title: true } } },
    });
  }

  async remove(userId: string, id: string) {
    await this.prisma.bookmark.deleteMany({ where: { id, userId } });
    return { deleted: true };
  }
}
