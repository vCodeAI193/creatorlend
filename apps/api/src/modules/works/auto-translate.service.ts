import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AutoTranslateService {
  constructor(private readonly prisma: PrismaService) {}

  async autoTranslate(workId: string, targetLanguage: string) {
    const work = await this.prisma.work.findUnique({
      where: { id: workId },
      select: { title: true, description: true, language: true },
    });
    if (!work) throw new Error('work_not_found');
    // Stub: in prod call DeepL or Google Translate API
    const translated = {
      title: `[${targetLanguage.toUpperCase()}] ${work.title}`,
      description: work.description ? `[${targetLanguage.toUpperCase()}] ${work.description}` : undefined,
      sourceLanguage: work.language ?? 'de',
      targetLanguage,
      isStub: true,
    };
    return translated;
  }
}
