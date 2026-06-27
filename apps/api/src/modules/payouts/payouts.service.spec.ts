import { BadRequestException } from "@nestjs/common";
import { PayoutsService } from "./payouts.service";

/** Unit-Tests der Stripe-Connect-Auszahlung (SDK/Prisma gemockt). */
describe("PayoutsService – Stripe Connect", () => {
  function build(opts: {
    stripeEnabled: boolean;
    connectAccountId?: string | null;
    pendingSum?: number;
    pendingCount?: number;
  }) {
    const prisma = {
      payoutItem: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amountCents: opts.pendingSum ?? 500 },
          _count: opts.pendingCount ?? 2,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: opts.pendingCount ?? 2 }),
      },
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: "artist-1",
          email: "artist@b.dev",
          stripeConnectAccountId: opts.connectAccountId ?? null,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    } as never;
    const notifications = { create: jest.fn().mockResolvedValue(undefined) } as never;
    const stripe = {
      isEnabled: jest.fn().mockReturnValue(opts.stripeEnabled),
      createConnectAccount: jest.fn().mockResolvedValue("acct_new"),
      createAccountLink: jest.fn().mockResolvedValue("https://connect.stripe.com/setup/acct_new"),
      createTransfer: jest.fn().mockResolvedValue("tr_1"),
    } as never;
    return { prisma, notifications, stripe, service: new PayoutsService(prisma, notifications, stripe) };
  }

  it("startOnboarding legt ein Connect-Konto an und liefert den Link", async () => {
    const { service, prisma, stripe } = build({ stripeEnabled: true, connectAccountId: null });
    const res = await service.startOnboarding("artist-1");

    expect(res.onboardingUrl).toContain("connect.stripe.com");
    expect((stripe as unknown as { createConnectAccount: jest.Mock }).createConnectAccount)
      .toHaveBeenCalledWith("artist@b.dev");
    expect((prisma as unknown as { user: { update: jest.Mock } }).user.update)
      .toHaveBeenCalledWith(
        expect.objectContaining({ data: { stripeConnectAccountId: "acct_new" } }),
      );
  });

  it("withdraw überweist via Stripe und markiert Posten als PAID", async () => {
    const { service, stripe } = build({ stripeEnabled: true, connectAccountId: "acct_1" });
    const res = await service.withdraw("artist-1");

    expect((stripe as unknown as { createTransfer: jest.Mock }).createTransfer)
      .toHaveBeenCalledWith(500, "eur", "acct_1");
    expect(res.transferred).toBe(2);
    expect(res.amountCents).toBe(500);
  });

  it("withdraw verlangt ein Connect-Konto, wenn Stripe aktiv ist", async () => {
    const { service } = build({ stripeEnabled: true, connectAccountId: null });
    await expect(service.withdraw("artist-1")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("withdraw nutzt den Dev-Pfad ohne Stripe (keine Überweisung)", async () => {
    const { service, stripe } = build({ stripeEnabled: false });
    const res = await service.withdraw("artist-1");
    expect((stripe as unknown as { createTransfer: jest.Mock }).createTransfer).not.toHaveBeenCalled();
    expect(res.transferred).toBe(2);
  });
});
