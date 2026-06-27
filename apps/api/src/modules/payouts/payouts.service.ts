import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

const PAGE_SIZE = 20;

@Injectable()
export class PayoutsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Aggregierte Vergütung: ausstehend, ausgezahlt, Gesamtzahl Ausleihen. */
  async summary(artistId: string) {
    const [pending, paid, lifetimeLoans] = await Promise.all([
      this.prisma.payoutItem.aggregate({
        where: { artistId, status: "PENDING" },
        _sum: { amountCents: true },
      }),
      this.prisma.payoutItem.aggregate({
        where: { artistId, status: "PAID" },
        _sum: { amountCents: true },
      }),
      this.prisma.payoutItem.count({ where: { artistId } }),
    ]);

    return {
      currency: "eur",
      pendingCents: pending._sum.amountCents ?? 0,
      paidCents: paid._sum.amountCents ?? 0,
      lifetimeLoans,
    };
  }

  async items(artistId: string, status: string | undefined, page: number) {
    const where = {
      artistId,
      ...(status ? { status: status as never } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.payoutItem.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (Math.max(page, 1) - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.payoutItem.count({ where }),
    ]);

    return { items, meta: { page, pageSize: PAGE_SIZE, total } };
  }

  /**
   * Stößt eine Auszahlung der ausstehenden Posten an. In der Implementierung
   * erfolgt der eigentliche Transfer über Stripe Connect; danach werden die
   * Posten auf PAID gesetzt. Hier als transaktionaler Platzhalter.
   */
  async withdraw(artistId: string) {
    const result = await this.prisma.payoutItem.updateMany({
      where: { artistId, status: "PENDING" },
      data: { status: "PAID" },
    });
    return { transferred: result.count };
  }
}
