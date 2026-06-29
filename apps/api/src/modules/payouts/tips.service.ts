import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { StripeService } from "../stripe/stripe.service";

/** Trinkgeld / Micropayment (F-323). */
@Injectable()
export class TipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  async sendTip(senderId: string, artistId: string, amountCents: number, workId?: string, message?: string) {
    if (amountCents < 100) throw new BadRequestException("minimum_tip_100_cents");
    const artist = await this.prisma.user.findUnique({ where: { id: artistId } });
    if (!artist) throw new NotFoundException("artist_not_found");
    const tip = await this.prisma.tip.create({
      data: { senderId, artistId, amountCents, workId, message },
    });
    // In prod: create Stripe payment; in dev: just record
    return { tip, mode: this.stripe.isEnabled() ? "stripe" : "dev" };
  }

  async receivedTips(artistId: string) {
    const [tips, total] = await Promise.all([
      this.prisma.tip.findMany({
        where: { artistId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { sender: { select: { displayName: true } } },
      }),
      this.prisma.tip.aggregate({ where: { artistId }, _sum: { amountCents: true } }),
    ]);
    return { tips, totalCents: total._sum.amountCents ?? 0 };
  }
}
