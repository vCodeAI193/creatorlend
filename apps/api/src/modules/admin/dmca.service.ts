import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MailService } from "../mail/mail.service";

@Injectable()
export class DmcaService {
  private readonly adminEmail = process.env.ADMIN_EMAIL ?? "admin@creatorlend.com";

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /** Files a DMCA takedown request and notifies admin. */
  async fileRequest(
    workId: string,
    reporterEmail: string,
    reason: string,
    reporterId?: string,
  ) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work) throw new NotFoundException("work_not_found");

    const takedown = await this.prisma.dmcaTakedown.create({
      data: { workId, reporterEmail, reason, reporterId },
    });

    // Notify admin
    await this.mail.sendEmail(
      this.adminEmail,
      `[DMCA] Neuer Takedown-Antrag für Werk ${workId}`,
      `Von: ${reporterEmail}\nGrund: ${reason}\nTakedown-ID: ${takedown.id}`,
    );

    return { submitted: true, id: takedown.id };
  }

  /** Lists DMCA takedown requests (admin only). */
  async listRequests(status?: string) {
    return this.prisma.dmcaTakedown.findMany({
      where: status ? { status } : {},
      include: { work: { select: { id: true, title: true, artistId: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Resolves a DMCA takedown request (admin only). */
  async resolveRequest(id: string, action: "TAKE_DOWN" | "DISMISS", adminNote?: string) {
    const takedown = await this.prisma.dmcaTakedown.findUnique({ where: { id } });
    if (!takedown) throw new NotFoundException("takedown_not_found");

    const status = action === "TAKE_DOWN" ? "TAKEN_DOWN" : "DISMISSED";
    const resolvedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.dmcaTakedown.update({
        where: { id },
        data: { status, adminNote, resolvedAt },
      });

      if (action === "TAKE_DOWN") {
        await tx.work.update({
          where: { id: takedown.workId },
          data: { status: "DRAFT" },
        });
      }
    });

    return { resolved: true, status, action };
  }
}
