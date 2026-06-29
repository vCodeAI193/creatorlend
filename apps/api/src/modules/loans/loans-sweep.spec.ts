import { LoansService } from "./loans.service";
import { MediaService } from "../media/media.service";

/** Unit-Tests der Hintergrund-Sweeps (Ablauf + Kontingent-Reset). */
describe("LoansService – Sweeps (Phase 2)", () => {
  const media = new MediaService();

  it("setzt fällige Leihen auf EXPIRED und benachrichtigt die Hörer:innen", async () => {
    const due = [
      { id: "loan-1", userId: "u1", workId: "w1" },
      { id: "loan-2", userId: "u2", workId: "w2" },
    ];
    const prisma = {
      loan: {
        findMany: jest.fn().mockResolvedValue(due),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    } as never;
    const notifications = {
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
    } as never;

    const service = new LoansService(prisma, media, notifications, { sendEmail: jest.fn() } as never);
    const result = await service.runExpirySweep();

    expect(result.expired).toBe(2);
    expect(
      (notifications as unknown as { createMany: jest.Mock }).createMany,
    ).toHaveBeenCalledTimes(1);
    const arg = (notifications as unknown as { createMany: jest.Mock }).createMany.mock.calls[0][0];
    expect(arg).toHaveLength(2);
    expect(arg[0].type).toBe("LOAN_EXPIRED");
  });

  it("macht nichts, wenn keine Leihe fällig ist", async () => {
    const prisma = {
      loan: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn() },
    } as never;
    const notifications = { createMany: jest.fn() } as never;

    const service = new LoansService(prisma, media, notifications, { sendEmail: jest.fn() } as never);
    const result = await service.runExpirySweep();

    expect(result.expired).toBe(0);
    expect((prisma as unknown as { loan: { updateMany: jest.Mock } }).loan.updateMany)
      .not.toHaveBeenCalled();
  });

  it("setzt abgelaufene Kontingente zurück", async () => {
    const prisma = {
      subscription: { updateMany: jest.fn().mockResolvedValue({ count: 3 }) },
    } as never;
    const notifications = {} as never;

    const service = new LoansService(prisma, media, notifications, { sendEmail: jest.fn() } as never);
    const result = await service.resetExpiredQuotas();

    expect(result.reset).toBe(3);
  });
});
