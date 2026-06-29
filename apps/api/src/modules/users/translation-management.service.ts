import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TranslationManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async listPendingTranslations(targetLanguage: string) {
    const works = await this.prisma.work.findMany({
      where: {
        status: 'PUBLISHED',
        NOT: { translations: { some: { language: targetLanguage } } },
      },
      select: { id: true, title: true, language: true },
      take: 50,
    });
    return { targetLanguage, pendingCount: works.length, works };
  }

  async exportForTranslation(targetLanguage: string) {
    const pending = await this.listPendingTranslations(targetLanguage);
    const csv = ['workId,originalTitle,sourceLanguage',
      ...pending.works.map(w => `${w.id},${(w.title ?? '').replace(/,/g, ';')},${w.language ?? 'de'}`)
    ].join('\n');
    return csv;
  }
}
