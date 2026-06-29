import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export interface CreateDiscountCodeDto {
  code: string;
  discountPercent: number;
  maxUses?: number;
  expiresAt?: string;
}

/** F-383: Artist discount codes. */
@Injectable()
export class DiscountCodesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(artistId: string, dto: CreateDiscountCodeDto) {
    if (dto.discountPercent < 1 || dto.discountPercent > 100) {
      throw new BadRequestException("discount_percent_must_be_1_to_100");
    }
    return this.prisma.discountCode.create({
      data: {
        artistId,
        code: dto.code.toUpperCase().trim(),
        discountPercent: dto.discountPercent,
        maxUses: dto.maxUses ?? 1,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
  }

  async list(artistId: string) {
    return this.prisma.discountCode.findMany({
      where: { artistId },
      orderBy: { createdAt: "desc" },
    });
  }

  async delete(artistId: string, codeId: string) {
    const code = await this.prisma.discountCode.findUnique({ where: { id: codeId } });
    if (!code) throw new NotFoundException("discount_code_not_found");
    if (code.artistId !== artistId) throw new ForbiddenException("not_owner");
    await this.prisma.discountCode.delete({ where: { id: codeId } });
    return { deleted: true };
  }

  /**
   * Validate and apply a discount code to a work.
   * Returns the discounted price in cents.
   */
  async apply(code: string, workId: string, userId: string) {
    const discountCode = await this.prisma.discountCode.findUnique({
      where: { code: code.toUpperCase().trim() },
    });
    if (!discountCode) throw new NotFoundException("discount_code_not_found");

    if (discountCode.expiresAt && discountCode.expiresAt < new Date()) {
      throw new BadRequestException("discount_code_expired");
    }
    if (discountCode.usedCount >= discountCode.maxUses) {
      throw new BadRequestException("discount_code_exhausted");
    }

    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.status !== "PUBLISHED") throw new NotFoundException("work_not_found");

    // Discount must be for this artist's works
    if (work.artistId !== discountCode.artistId) {
      throw new BadRequestException("discount_code_not_applicable");
    }

    const originalPrice = work.loanPriceCents;
    const discount = Math.round(originalPrice * (discountCode.discountPercent / 100));
    const discountedPrice = Math.max(0, originalPrice - discount);

    return {
      code: discountCode.code,
      discountPercent: discountCode.discountPercent,
      originalPriceCents: originalPrice,
      discountCents: discount,
      discountedPriceCents: discountedPrice,
      workId,
    };
  }
}
