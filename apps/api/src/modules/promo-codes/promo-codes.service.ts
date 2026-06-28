import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

interface CreatePromoCodeInput {
  code: string;
  discountPercent?: number;
  discountCents?: number;
  plan?: string;
  maxUses?: number;
  expiresAt?: string;
}

@Injectable()
export class PromoCodesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Prüft, ob ein Code gültig ist (ohne ihn einzulösen). */
  async validate(code: string, userId: string, plan?: string) {
    const promo = await this.prisma.promoCode.findUnique({ where: { code } });
    if (!promo) throw new NotFoundException("promo_code_not_found");
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      throw new BadRequestException("promo_code_expired");
    }
    if (promo.maxUses !== null && promo.usesCount >= promo.maxUses) {
      throw new BadRequestException("promo_code_exhausted");
    }
    if (promo.plan && plan && promo.plan !== plan) {
      throw new BadRequestException("promo_code_wrong_plan");
    }
    const alreadyUsed = await this.prisma.promoRedemption.findUnique({
      where: { promoCodeId_userId: { promoCodeId: promo.id, userId } },
    });
    if (alreadyUsed) throw new ConflictException("promo_code_already_redeemed");
    return { valid: true, discountPercent: promo.discountPercent, discountCents: promo.discountCents, plan: promo.plan };
  }

  /** Löst einen Code ein: Validierung + PromoRedemption + usesCount++. */
  async redeem(code: string, userId: string, plan?: string) {
    const result = await this.validate(code, userId, plan);
    const promo = await this.prisma.promoCode.findUniqueOrThrow({ where: { code } });
    await this.prisma.$transaction([
      this.prisma.promoRedemption.create({ data: { promoCodeId: promo.id, userId } }),
      this.prisma.promoCode.update({ where: { id: promo.id }, data: { usesCount: { increment: 1 } } }),
    ]);
    return result;
  }

  /** Admin: Promo-Code anlegen. */
  async create(input: CreatePromoCodeInput) {
    return this.prisma.promoCode.create({
      data: {
        code: input.code,
        discountPercent: input.discountPercent,
        discountCents: input.discountCents,
        plan: input.plan,
        maxUses: input.maxUses,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    });
  }

  /** Admin: alle Promo-Codes auflisten. */
  list() {
    return this.prisma.promoCode.findMany({ orderBy: { createdAt: "desc" } });
  }
}
