import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

const PLAN_QUOTA: Record<string, number> = {
  LITE: 5,
  STANDARD: 10,
  PREMIUM: 30,
  ANNUAL: 120,
};

@Injectable()
export class GiftCodesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Creates a gift code for a plan. */
  async createGiftCode(
    senderId: string,
    planId: string,
    durationDays = 30,
    recipientEmail?: string,
    expiresAt?: Date,
  ) {
    return this.prisma.giftCode.create({
      data: {
        senderId,
        planId,
        durationDays,
        recipientEmail,
        expiresAt,
      },
    });
  }

  /** Redeems a gift code for the given user. */
  async redeemGiftCode(userId: string, code: string) {
    const giftCode = await this.prisma.giftCode.findUnique({ where: { code } });

    if (!giftCode) throw new NotFoundException("gift_code_not_found");
    if (giftCode.redeemedAt) throw new BadRequestException("gift_code_already_redeemed");
    if (giftCode.expiresAt && giftCode.expiresAt < new Date()) {
      throw new BadRequestException("gift_code_expired");
    }
    if (giftCode.senderId === userId) {
      throw new BadRequestException("cannot_redeem_own_gift_code");
    }

    const quota = PLAN_QUOTA[giftCode.planId] ?? PLAN_QUOTA.STANDARD;
    const now = new Date();

    // Activate or extend subscription
    const existing = await this.prisma.subscription.findUnique({ where: { userId } });

    if (existing) {
      // Extend existing subscription
      const currentEnd = existing.currentPeriodEnd ?? now;
      const newEnd = new Date(
        Math.max(currentEnd.getTime(), now.getTime()) +
          giftCode.durationDays * 24 * 60 * 60 * 1000,
      );
      await this.prisma.subscription.update({
        where: { userId },
        data: {
          plan: giftCode.planId,
          status: "ACTIVE",
          loanQuotaPerPeriod: quota,
          currentPeriodEnd: newEnd,
          cancelAtPeriodEnd: false,
        },
      });
    } else {
      const periodEnd = new Date(now.getTime() + giftCode.durationDays * 24 * 60 * 60 * 1000);
      await this.prisma.subscription.create({
        data: {
          userId,
          plan: giftCode.planId,
          status: "ACTIVE",
          loanQuotaPerPeriod: quota,
          loansUsedThisPeriod: 0,
          currentPeriodEnd: periodEnd,
        },
      });
    }

    // Mark gift code as redeemed
    await this.prisma.giftCode.update({
      where: { id: giftCode.id },
      data: { redeemedAt: now, recipientId: userId },
    });

    return { redeemed: true, planId: giftCode.planId, durationDays: giftCode.durationDays };
  }
}
