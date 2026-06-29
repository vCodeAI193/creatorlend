import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TranscriptsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(artistId: string, workId: string, input: { language: string; format: string; content: string }) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new NotFoundException('work_not_found');
    return this.prisma.transcript.upsert({
      where: { workId_language: { workId, language: input.language } },
      create: { workId, ...input },
      update: { format: input.format, content: input.content },
    });
  }

  async list(workId: string) {
    return this.prisma.transcript.findMany({ where: { workId }, select: { id: true, language: true, format: true, createdAt: true } });
  }

  async get(workId: string, language: string) {
    const t = await this.prisma.transcript.findUnique({ where: { workId_language: { workId, language } } });
    if (!t) throw new NotFoundException('transcript_not_found');
    return t;
  }

  async delete(artistId: string, workId: string, language: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.artistId !== artistId) throw new NotFoundException('work_not_found');
    await this.prisma.transcript.deleteMany({ where: { workId, language } });
    return { deleted: true };
  }

  async search(workId: string, q: string) {
    const t = await this.prisma.transcript.findFirst({ where: { workId } });
    if (!t) return { matches: [] };
    const lines = t.content.split('\n');
    const matches = lines
      .map((line, i) => ({ line: i + 1, text: line }))
      .filter(l => l.text.toLowerCase().includes(q.toLowerCase()));
    return { workId, query: q, matches: matches.slice(0, 20) };
  }
}
