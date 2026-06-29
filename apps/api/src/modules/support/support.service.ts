import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  // F-693: Ticket erstellen
  async createTicket(userId: string, subject: string, body: string, priority?: string) {
    const slaDeadline = new Date(Date.now() + (priority === 'URGENT' ? 4 : priority === 'HIGH' ? 24 : 72) * 60 * 60 * 1000);
    return this.prisma.supportTicket.create({
      data: { userId, subject, body, priority: priority ?? 'NORMAL', slaDeadline },
    });
  }

  // F-693: Eigene Tickets abrufen
  async listTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // F-693: Ticket abrufen
  async getTicket(userId: string, id: string) {
    const ticket = await this.prisma.supportTicket.findFirst({ where: { id, userId } });
    if (!ticket) throw new NotFoundException('ticket_not_found');
    return ticket;
  }

  // F-694: SLA-Überwachung – Tickets mit überschrittenem SLA
  async listSlaBreaches() {
    const now = new Date();
    return this.prisma.supportTicket.findMany({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, slaDeadline: { lt: now } },
      orderBy: { slaDeadline: 'asc' },
    });
  }

  // F-693: Status aktualisieren (Admin/Support)
  async updateStatus(id: string, status: string, assigneeId?: string) {
    const data: Record<string, unknown> = { status };
    if (assigneeId) data.assigneeId = assigneeId;
    if (status === 'RESOLVED' || status === 'CLOSED') data.resolvedAt = new Date();
    return this.prisma.supportTicket.update({ where: { id }, data });
  }

  // F-700: CSAT-Score nach Lösung
  async submitCsat(userId: string, id: string, score: number) {
    if (score < 1 || score > 5) throw new BadRequestException('csat_score_must_be_1_to_5');
    const ticket = await this.prisma.supportTicket.findFirst({ where: { id, userId } });
    if (!ticket) throw new NotFoundException('ticket_not_found');
    return this.prisma.supportTicket.update({ where: { id }, data: { csatScore: score } });
  }

  // Admin: alle Tickets auflisten
  async listAllTickets(status?: string, assigneeId?: string) {
    return this.prisma.supportTicket.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(assigneeId ? { assigneeId } : {}),
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
  }
}
