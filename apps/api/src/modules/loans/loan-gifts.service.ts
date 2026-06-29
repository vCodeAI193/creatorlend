import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/notification-types";
import { LoansService } from "./loans.service";

/**
 * F-259 – Leihe als Geschenk an andere Nutzer:innen senden.
 */
@Injectable()
export class LoanGiftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly loansService: LoansService,
  ) {}

  /** Leihe verschenken. */
  async send(senderId: string, recipientId: string, workId: string, message?: string) {
    if (senderId === recipientId) {
      throw new BadRequestException("cannot_gift_to_yourself");
    }
    const [recipient, work] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: recipientId } }),
      this.prisma.work.findUnique({ where: { id: workId } }),
    ]);
    if (!recipient) throw new NotFoundException("recipient_not_found");
    if (!work || work.status !== "PUBLISHED") throw new NotFoundException("work_not_found");

    const gift = await this.prisma.loanGift.create({
      data: { senderId, recipientId, workId, message, status: "PENDING" },
    });

    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { displayName: true },
    });

    await this.notifications.create({
      userId: recipientId,
      type: NotificationType.LOAN_GIFT_RECEIVED,
      title: "Du hast eine Leihe als Geschenk erhalten!",
      body: `${sender?.displayName ?? "Jemand"} hat dir „${work.title}" geschenkt.`,
      data: { giftId: gift.id, workId, senderId },
    });

    return gift;
  }

  /** Geschenk annehmen → Leihe erstellen. */
  async accept(recipientId: string, giftId: string) {
    const gift = await this.prisma.loanGift.findUnique({ where: { id: giftId } });
    if (!gift) throw new NotFoundException("gift_not_found");
    if (gift.recipientId !== recipientId) throw new ForbiddenException("not_recipient");
    if (gift.status !== "PENDING") throw new BadRequestException("gift_already_resolved");

    const loan = await this.loansService.borrowWithoutSubscription(recipientId, gift.workId);

    return this.prisma.loanGift.update({
      where: { id: giftId },
      data: { status: "ACCEPTED", loanId: (loan as { id: string }).id, acceptedAt: new Date() },
    });
  }

  /** Geschenk ablehnen. */
  async decline(recipientId: string, giftId: string) {
    const gift = await this.prisma.loanGift.findUnique({ where: { id: giftId } });
    if (!gift) throw new NotFoundException("gift_not_found");
    if (gift.recipientId !== recipientId) throw new ForbiddenException("not_recipient");
    if (gift.status !== "PENDING") throw new BadRequestException("gift_already_resolved");

    return this.prisma.loanGift.update({
      where: { id: giftId },
      data: { status: "DECLINED" },
    });
  }

  /** Ausstehende empfangene Geschenke auflisten. */
  async listReceived(userId: string) {
    return this.prisma.loanGift.findMany({
      where: { recipientId: userId, status: "PENDING" },
      include: {
        sender: { select: { id: true, displayName: true } },
        work: { select: { id: true, title: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Gesendete Geschenke auflisten. */
  async listSent(userId: string) {
    return this.prisma.loanGift.findMany({
      where: { senderId: userId },
      include: {
        recipient: { select: { id: true, displayName: true } },
        work: { select: { id: true, title: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
