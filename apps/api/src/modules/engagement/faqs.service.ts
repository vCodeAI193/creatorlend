import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FaqsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(artistId: string, question: string, answer?: string) {
    return this.prisma.artistFaq.create({ data: { artistId, question, answer } });
  }

  async update(artistId: string, id: string, data: { question?: string; answer?: string; sortOrder?: number }) {
    const faq = await this.prisma.artistFaq.findUnique({ where: { id } });
    if (!faq) throw new NotFoundException('faq_not_found');
    if (faq.artistId !== artistId) throw new ForbiddenException('not_your_faq');
    return this.prisma.artistFaq.update({ where: { id }, data });
  }

  async delete(artistId: string, id: string) {
    const faq = await this.prisma.artistFaq.findUnique({ where: { id } });
    if (!faq) throw new NotFoundException('faq_not_found');
    if (faq.artistId !== artistId) throw new ForbiddenException('not_your_faq');
    await this.prisma.artistFaq.delete({ where: { id } });
    return { deleted: true };
  }

  async list(artistId: string) {
    return this.prisma.artistFaq.findMany({
      where: { artistId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async reorder(artistId: string, orderedIds: string[]) {
    await Promise.all(
      orderedIds.map((id, index) =>
        this.prisma.artistFaq.updateMany({ where: { id, artistId }, data: { sortOrder: index } }),
      ),
    );
    return { reordered: true };
  }
}
