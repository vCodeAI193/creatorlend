import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export interface UpsertBillingAddressDto {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  vatNumber?: string;
}

/** F-341: Billing address management. */
@Injectable()
export class BillingAddressService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    return this.prisma.billingAddress.findUnique({ where: { userId } });
  }

  async upsert(userId: string, dto: UpsertBillingAddressDto) {
    return this.prisma.billingAddress.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: { ...dto },
    });
  }
}
