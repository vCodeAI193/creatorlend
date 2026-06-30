import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContentModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async moderateText(text: string) {
    // Stub: in prod call Perspective API or AWS Comprehend
    const hasProfanity = /badword/i.test(text);
    return {
      text: text.slice(0, 50),
      flagged: hasProfanity,
      scores: { toxicity: hasProfanity ? 0.9 : 0.05, spam: 0.02 },
      action: hasProfanity ? 'BLOCK' : 'ALLOW',
      isStub: true,
    };
  }

  async moderateWork(workId: string) {
    const work = await this.prisma.work.findUnique({
      where: { id: workId },
      select: { title: true, description: true },
    });
    if (!work) throw new Error('work_not_found');
    const [titleResult, descResult] = await Promise.all([
      this.moderateText(work.title),
      this.moderateText(work.description ?? ''),
    ]);
    return { workId, title: titleResult, description: descResult, overallAction: titleResult.flagged || descResult.flagged ? 'REVIEW' : 'ALLOW' };
  }

  // F-728: KI-Auto-Flag bei verdächtigen Werken
  async autoFlagSuspiciousWork(workId: string): Promise<{ workId: string; flagged: boolean; reason?: string; action: string }> {
    const result = await this.moderateWork(workId);
    const flagged = result.overallAction === 'REVIEW';
    if (flagged) {
      return { workId, flagged: true, reason: 'AI auto-flag: potentially problematic content detected', action: 'QUEUED_FOR_REVIEW' };
    }
    return { workId, flagged: false, action: 'CLEARED' };
  }
}
