import { ConflictException, HttpException } from "@nestjs/common";
import { LoansService } from "./loans.service";
import { MediaService } from "../media/media.service";

/**
 * Unit-Tests des Kern-Loops mit gemocktem Prisma (kein DB-Zugriff).
 * Prüft Verguetungs-Erzeugung, Kontingent und Fehlerfälle.
 */
describe("LoansService (Kern-Loop)", () => {
  const work = {
    id: "work-1",
    artistId: "artist-1",
    status: "PUBLISHED",
    loanPriceCents: 150,
  };

  function buildPrisma(overrides: Record<string, unknown> = {}) {
    const tx = {
      loan: {
        create: jest.fn().mockImplementation(({ data }) => ({
          id: "loan-1",
          renewalCount: 0,
          ...data,
        })),
        update: jest.fn().mockImplementation(({ data }) => ({
          id: "loan-1",
          workId: "work-1",
          ...data,
          // increment-Objekt von Prisma simulieren (0 -> 1)
          renewalCount: 1,
          status: "ACTIVE",
        })),
      },
      payoutItem: { create: jest.fn() },
      subscription: { update: jest.fn() },
    };
    return {
      _tx: tx,
      work: {
        findUnique: jest.fn().mockResolvedValue(work),
        findUniqueOrThrow: jest.fn().mockResolvedValue(work),
      },
      subscription: {
        findUnique: jest.fn().mockResolvedValue({
          status: "ACTIVE",
          loanQuotaPerPeriod: 10,
          loansUsedThisPeriod: 0,
        }),
      },
      loan: {
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn().mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx)),
      ...overrides,
    } as never;
  }

  const media = new MediaService();

  it("legt bei erfolgreicher Leihe Loan + PENDING-Verguetung an und verbraucht Kontingent", async () => {
    const prisma = buildPrisma();
    const service = new LoansService(prisma, media);

    const result = await service.borrow("user-1", "work-1");

    expect(result.status).toBe("ACTIVE");
    expect(result.access).not.toBeNull();
    expect((prisma as never as { _tx: { payoutItem: { create: jest.Mock } } })._tx.payoutItem.create)
      .toHaveBeenCalledWith({
        data: {
          artistId: "artist-1",
          loanId: "loan-1",
          amountCents: 150,
          status: "PENDING",
        },
      });
    expect((prisma as never as { _tx: { subscription: { update: jest.Mock } } })._tx.subscription.update)
      .toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: { loansUsedThisPeriod: { increment: 1 } },
      });
  });

  it("wirft no_active_subscription ohne aktives Abo", async () => {
    const prisma = buildPrisma({
      subscription: { findUnique: jest.fn().mockResolvedValue(null) },
    });
    const service = new LoansService(prisma, media);

    await expect(service.borrow("user-1", "work-1")).rejects.toBeInstanceOf(HttpException);
  });

  it("wirft quota_exceeded bei erschoepftem Kontingent", async () => {
    const prisma = buildPrisma({
      subscription: {
        findUnique: jest.fn().mockResolvedValue({
          status: "ACTIVE",
          loanQuotaPerPeriod: 5,
          loansUsedThisPeriod: 5,
        }),
      },
    });
    const service = new LoansService(prisma, media);

    await expect(service.borrow("user-1", "work-1")).rejects.toBeInstanceOf(ConflictException);
  });

  it("erhoeht beim Verlaengern renewalCount und legt zweite Verguetung an", async () => {
    const prisma = buildPrisma({
      loan: {
        findFirst: jest.fn().mockResolvedValue({
          id: "loan-1",
          workId: "work-1",
          status: "ACTIVE",
          renewalCount: 0,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    });
    const service = new LoansService(prisma, media);

    const result = await service.renew("user-1", "loan-1");

    expect(result.renewalCount).toBe(1);
    expect((prisma as never as { _tx: { payoutItem: { create: jest.Mock } } })._tx.payoutItem.create)
      .toHaveBeenCalledTimes(1);
  });
});
