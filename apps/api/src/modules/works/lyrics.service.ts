import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class LyricsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertOwner(artistId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work) throw new NotFoundException("work_not_found");
    if (work.artistId !== artistId) throw new ForbiddenException("not_owner");
  }

  async upsert(artistId: string, workId: string, content: string, format: string, language?: string) {
    await this.assertOwner(artistId, workId);
    return this.prisma.lyrics.upsert({
      where: { workId },
      create: { workId, content, format, language },
      update: { content, format, language },
    });
  }

  async get(workId: string) {
    return this.prisma.lyrics.findUnique({ where: { workId } });
  }

  async delete(artistId: string, workId: string) {
    await this.assertOwner(artistId, workId);
    await this.prisma.lyrics.delete({ where: { workId } });
    return { deleted: true };
  }

  async search(query: string) {
    return this.prisma.$queryRaw`
      SELECT l.*, w.title as "workTitle", w."artistId"
      FROM "Lyrics" l
      JOIN "Work" w ON w.id = l."workId"
      WHERE l.content ILIKE ${"%" + query + "%"}
      LIMIT 20
    `;
  }
}
