import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** F-536/F-537: Content-Feedback – nicht interessiert / mehr davon. F-538: Stimmungs-Votum. */
@Injectable()
export class ContentFeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  /** F-536: Werk als „nicht interessiert" markieren. */
  async notInterested(userId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work) throw new NotFoundException('work_not_found');
    return this.prisma.contentFeedback.upsert({
      where: { userId_workId_type: { userId, workId, type: 'NOT_INTERESTED' } },
      create: { userId, workId, type: 'NOT_INTERESTED' },
      update: {},
    });
  }

  /** Hebt „nicht interessiert"-Markierung auf. */
  async removeNotInterested(userId: string, workId: string) {
    await this.prisma.contentFeedback.deleteMany({ where: { userId, workId, type: 'NOT_INTERESTED' } });
    return { removed: true };
  }

  /** F-537: Feedback „Mehr davon" geben. */
  async moreLikeThis(userId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work) throw new NotFoundException('work_not_found');
    return this.prisma.contentFeedback.upsert({
      where: { userId_workId_type: { userId, workId, type: 'MORE_LIKE_THIS' } },
      create: { userId, workId, type: 'MORE_LIKE_THIS' },
      update: {},
    });
  }

  /** F-538: Stimmungs-Votum nach dem Hören abgeben (UP | DOWN). */
  async voteMood(userId: string, loanId: string, mood: 'UP' | 'DOWN') {
    const loan = await this.prisma.loan.findFirst({ where: { id: loanId, userId } });
    if (!loan) throw new NotFoundException('loan_not_found');
    return this.prisma.moodVote.upsert({
      where: { loanId_userId: { loanId, userId } },
      create: { userId, loanId, mood },
      update: { mood },
    });
  }

  /** Alle Feedback-Einträge eines Nutzers abrufen. */
  async getFeedback(userId: string) {
    const [feedbacks, votes] = await Promise.all([
      this.prisma.contentFeedback.findMany({ where: { userId }, select: { workId: true, type: true, createdAt: true } }),
      this.prisma.moodVote.findMany({ where: { userId }, select: { loanId: true, mood: true, createdAt: true } }),
    ]);
    return { feedbacks, moodVotes: votes };
  }

  /** Arbeiten, die als „nicht interessiert" markiert sind (für Discovery-Filter). */
  async getNotInterestedWorkIds(userId: string): Promise<string[]> {
    const results = await this.prisma.contentFeedback.findMany({
      where: { userId, type: 'NOT_INTERESTED' },
      select: { workId: true },
    });
    return results.map(r => r.workId);
  }
}
