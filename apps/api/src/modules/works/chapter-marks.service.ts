import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ChapterMarksService {
  constructor(private readonly prisma: PrismaService) {}

  private async ownedWork(artistId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work) throw new NotFoundException("work_not_found");
    if (work.artistId !== artistId) throw new ForbiddenException("not_owner");
    return work;
  }

  /** Kapitelmarke anlegen (B-034). */
  async create(
    artistId: string,
    workId: string,
    input: { title: string; positionSeconds: number; episodeId?: string },
  ) {
    await this.ownedWork(artistId, workId);
    return this.prisma.chapterMark.create({ data: { workId, ...input } });
  }

  /** Alle Kapitelmarken für ein Werk auflisten (öffentlich). */
  async list(workId: string) {
    return this.prisma.chapterMark.findMany({
      where: { workId },
      orderBy: { positionSeconds: "asc" },
    });
  }

  /** Kapitelmarke löschen. */
  async remove(artistId: string, workId: string, markId: string) {
    await this.ownedWork(artistId, workId);
    await this.prisma.chapterMark.deleteMany({ where: { id: markId, workId } });
    return { deleted: true };
  }
}
