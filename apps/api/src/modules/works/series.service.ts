import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SeriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(artistId: string, input: { title: string; description?: string }) {
    return this.prisma.series.create({ data: { artistId, ...input } });
  }

  async list(artistId: string) {
    return this.prisma.series.findMany({
      where: { artistId },
      include: { works: { include: { work: { select: { id: true, title: true, status: true } } }, orderBy: { position: 'asc' } } },
    });
  }

  async get(id: string) {
    const s = await this.prisma.series.findUnique({
      where: { id },
      include: { works: { include: { work: { select: { id: true, title: true, type: true, loanPriceCents: true, status: true, borrowCount: true } } }, orderBy: { position: 'asc' } } },
    });
    if (!s) throw new NotFoundException('series_not_found');
    return s;
  }

  async addWork(artistId: string, seriesId: string, workId: string, position = 0) {
    const series = await this.prisma.series.findUnique({ where: { id: seriesId } });
    if (!series || series.artistId !== artistId) throw new ForbiddenException('not_your_series');
    return this.prisma.seriesItem.upsert({
      where: { seriesId_workId: { seriesId, workId } },
      create: { seriesId, workId, position },
      update: { position },
    });
  }

  async removeWork(artistId: string, seriesId: string, workId: string) {
    const series = await this.prisma.series.findUnique({ where: { id: seriesId } });
    if (!series || series.artistId !== artistId) throw new ForbiddenException('not_your_series');
    await this.prisma.seriesItem.deleteMany({ where: { seriesId, workId } });
    return { removed: true };
  }

  async delete(artistId: string, seriesId: string) {
    const series = await this.prisma.series.findUnique({ where: { id: seriesId } });
    if (!series || series.artistId !== artistId) throw new ForbiddenException('not_your_series');
    await this.prisma.series.delete({ where: { id: seriesId } });
    return { deleted: true };
  }
}
