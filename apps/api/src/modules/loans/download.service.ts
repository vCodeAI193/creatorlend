import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../media/media.service';

@Injectable()
export class DownloadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  async getDownloadUrl(userId: string, loanId: string) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan || loan.userId !== userId) throw new Error('loan_not_found');
    if (loan.status !== 'ACTIVE' || (loan.expiresAt && loan.expiresAt < new Date())) {
      throw new Error('loan_expired');
    }
    const expiresAt = loan.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return { downloadUrl: this.media.getStreamUrl(loan.workId, expiresAt), expiresAt };
  }

  async checkExpiredDownloads(userId: string) {
    const expired = await this.prisma.loan.findMany({
      where: { userId, status: 'ACTIVE', expiresAt: { lt: new Date() } },
      select: { id: true, workId: true, expiresAt: true },
    });
    return { expiredCount: expired.length, expired };
  }
}
