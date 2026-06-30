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

  // F-411: ZUGFeRD / XRechnung XML stub
  async getInvoiceXml(payoutId: string) {
    const payout = await this.prisma.payoutItem.findUnique({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException("payout_not_found");
    return {
      format: 'ZUGFeRD 2.1 / XRechnung',
      message: 'Install zugferd-node or facturx library to generate compliant XML',
      invoiceNumber: `CL-${payoutId.slice(-8).toUpperCase()}`,
      amountCents: payout.amountCents,
      currency: 'EUR',
      issueDate: payout.createdAt.toISOString().split('T')[0],
    };
  }

  // F-402: Datev / ELSTER accounting export stub
  async getAccountingExport(artistId: string, year: number, format: string) {
    const items = await this.prisma.payoutItem.findMany({
      where: {
        artistId,
        status: 'PAID',
        createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) },
      },
      select: { id: true, amountCents: true, createdAt: true },
    });
    const totalCents = items.reduce((acc: number, i: { amountCents: number }) => acc + i.amountCents, 0);
    return {
      format: format === 'elster' ? 'ELSTER UStVA' : 'DATEV CSV',
      year,
      totalEarningsEuro: totalCents / 100,
      transactionCount: items.length,
      items: items.map((i: { id: string; amountCents: number; createdAt: Date }) => ({
        id: i.id, amountEuro: i.amountCents / 100, date: i.createdAt.toISOString().split('T')[0],
      })),
      message: 'Use a certified Datev connector or ELSTER API for production submissions',
    };
  }
}
