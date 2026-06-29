import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LoansService } from './loans.service';

@Injectable()
export class SingleLoanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loansService: LoansService,
  ) {}

  async initiatePurchase(userId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.status !== 'PUBLISHED') throw new NotFoundException('work_not_found');
    const purchase = await this.prisma.singleLoanPurchase.create({
      data: { userId, workId, amountCents: work.loanPriceCents, status: 'PENDING' },
    });
    return { purchaseId: purchase.id, amountCents: purchase.amountCents };
  }

  async completePurchase(purchaseId: string) {
    const purchase = await this.prisma.singleLoanPurchase.findUnique({ where: { id: purchaseId } });
    if (!purchase) throw new NotFoundException('purchase_not_found');
    const loan = await this.loansService.borrowWithoutSubscription(purchase.userId, purchase.workId);
    await this.prisma.singleLoanPurchase.update({
      where: { id: purchaseId },
      data: { status: 'COMPLETED', loanId: loan.id },
    });
    return { purchase: { ...purchase, status: 'COMPLETED' }, loan };
  }
}
