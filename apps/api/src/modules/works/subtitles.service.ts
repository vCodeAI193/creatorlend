import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SubtitlesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertOwner(artistId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work) throw new NotFoundException("work_not_found");
    if (work.artistId !== artistId) throw new ForbiddenException("not_owner");
    return work;
  }

  async create(artistId: string, workId: string, language: string, format: string, url: string) {
    await this.assertOwner(artistId, workId);
    return this.prisma.subtitleTrack.create({ data: { workId, language, format, url } });
  }

  async list(workId: string) {
    return this.prisma.subtitleTrack.findMany({ where: { workId }, orderBy: { createdAt: "asc" } });
  }

  async delete(artistId: string, workId: string, trackId: string) {
    await this.assertOwner(artistId, workId);
    await this.prisma.subtitleTrack.delete({ where: { id: trackId } });
    return { deleted: true };
  }

  async setDefault(artistId: string, workId: string, trackId: string) {
    await this.assertOwner(artistId, workId);
    await this.prisma.subtitleTrack.updateMany({ where: { workId }, data: { isDefault: false } });
    return this.prisma.subtitleTrack.update({ where: { id: trackId }, data: { isDefault: true } });
  }
}
