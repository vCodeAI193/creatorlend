import type Stripe from "stripe";
import { SubscriptionsService } from "./subscriptions.service";

/** Unit-Tests der Stripe-Abo-Integration (SDK/Prisma gemockt). */
describe("SubscriptionsService – Stripe", () => {
  function build(stripeEnabled: boolean, prismaOverrides: Record<string, unknown> = {}) {
    const prisma = {
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "u1", email: "a@b.dev" }),
      },
      subscription: {
        upsert: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      ...prismaOverrides,
    } as never;
    const stripe = {
      isEnabled: jest.fn().mockReturnValue(stripeEnabled),
      createCheckoutSession: jest
        .fn()
        .mockResolvedValue({ id: "cs_1", url: "https://checkout.stripe.com/s/cs_1" }),
    } as never;
    return { prisma, stripe, service: new SubscriptionsService(prisma, stripe) };
  }

  it("createCheckout nutzt den Dev-Fallback, wenn Stripe deaktiviert ist", async () => {
    const { service } = build(false);
    const res = await service.createCheckout("u1", "STANDARD");
    expect(res.mode).toBe("dev");
  });

  it("createCheckout erstellt eine Stripe-Session, wenn aktiviert + Price gesetzt", async () => {
    process.env.STRIPE_PRICE_STANDARD = "price_std";
    const { service, stripe } = build(true);
    const res = await service.createCheckout("u1", "STANDARD");
    expect(res.mode).toBe("stripe");
    expect(res.checkoutUrl).toContain("checkout.stripe.com");
    expect((stripe as unknown as { createCheckoutSession: jest.Mock }).createCheckoutSession)
      .toHaveBeenCalledWith(expect.objectContaining({ priceId: "price_std", userId: "u1" }));
    delete process.env.STRIPE_PRICE_STANDARD;
  });

  it("Webhook checkout.session.completed aktiviert das Abo", async () => {
    const { service, prisma } = build(true);
    const event = {
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { userId: "u1", plan: "PREMIUM" },
          customer: "cus_1",
          subscription: "sub_1",
        },
      },
    } as unknown as Stripe.Event;

    await service.handleStripeEvent(event);

    const upsert = (prisma as unknown as { subscription: { upsert: jest.Mock } }).subscription.upsert;
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0].create).toEqual(
      expect.objectContaining({
        userId: "u1",
        plan: "PREMIUM",
        status: "ACTIVE",
        loanQuotaPerPeriod: 30,
        stripeSubscriptionId: "sub_1",
      }),
    );
  });

  it("Webhook customer.subscription.deleted setzt das Abo auf CANCELED", async () => {
    const { service, prisma } = build(true);
    const event = {
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_1", status: "canceled", cancel_at_period_end: false } },
    } as unknown as Stripe.Event;

    await service.handleStripeEvent(event);

    const updateMany = (prisma as unknown as { subscription: { updateMany: jest.Mock } })
      .subscription.updateMany;
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeSubscriptionId: "sub_1" },
        data: expect.objectContaining({ status: "CANCELED" }),
      }),
    );
  });
});
