import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class WorkTranslationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertOwner(artistId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work) throw new NotFoundException("work_not_found");
    if (work.artistId !== artistId) throw new ForbiddenException("not_owner");
  }

  async upsert(artistId: string, workId: string, language: string, title: string, description?: string) {
    await this.assertOwner(artistId, workId);
    return this.prisma.workTranslation.upsert({
      where: { workId_language: { workId, language } },
      create: { workId, language, title, description },
      update: { title, description },
    });
  }

  async list(workId: string) {
    return this.prisma.workTranslation.findMany({ where: { workId } });
  }

  async delete(artistId: string, workId: string, language: string) {
    await this.assertOwner(artistId, workId);
    await this.prisma.workTranslation.delete({ where: { workId_language: { workId, language } } });
    return { deleted: true };
  }
}
