import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/** F-344/F-345: Invoice PDF generation and archive. */
@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * F-344: Generate a stub PDF buffer for a payout item.
   * Returns placeholder PDF bytes.
   */
  async generateInvoicePdf(payoutId: string): Promise<Buffer> {
    const payout = await this.prisma.payoutItem.findUnique({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException("payout_not_found");

    // Stub PDF content – in production this would use a PDF library
    const pdfContent = `%PDF-1.4\n% CreatorLend Invoice\n% PayoutId: ${payoutId}\n% Amount: ${payout.amountCents} cents\n% Status: ${payout.status}\n% Date: ${payout.createdAt.toISOString()}\n%%EOF`;
    return Buffer.from(pdfContent, "utf-8");
  }

  /**
   * F-345: List all payout items (invoice archive) for a user.
   */
  async listInvoices(artistId: string) {
    const items = await this.prisma.payoutItem.findMany({
      where: { artistId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amountCents: true,
        status: true,
        createdAt: true,
      },
    });

    return items.map((item) => ({
      id: item.id,
      amount: item.amountCents,
      currency: "eur",
      status: item.status,
      createdAt: item.createdAt,
    }));
  }
}
