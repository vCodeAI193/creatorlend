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

  // F-605: Community-Feature-Requests – in-memory store (kein dediziertes DB-Modell im MVP)
  // Production: replace with FeatureRequest + FeatureRequestVote Prisma models
  private featureRequests: Map<string, { id: string; title: string; description: string; authorId: string; votes: Set<string>; createdAt: string }> = new Map();
  private nextId = 1;

  listFeatureRequests(sortBy: 'votes' | 'newest' = 'votes') {
    const items = [...this.featureRequests.values()].map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      authorId: r.authorId,
      voteCount: r.votes.size,
      createdAt: r.createdAt,
    }));
    if (sortBy === 'votes') items.sort((a, b) => b.voteCount - a.voteCount);
    else items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return items;
  }

  createFeatureRequest(userId: string, title: string, description: string) {
    const id = String(this.nextId++);
    this.featureRequests.set(id, { id, title, description, authorId: userId, votes: new Set([userId]), createdAt: new Date().toISOString() });
    return { id, title, description, voteCount: 1, createdAt: this.featureRequests.get(id)!.createdAt };
  }

  voteFeatureRequest(userId: string, id: string) {
    const req = this.featureRequests.get(id);
    if (!req) throw new NotFoundException('feature_request_not_found');
    const alreadyVoted = req.votes.has(userId);
    if (alreadyVoted) req.votes.delete(userId);
    else req.votes.add(userId);
    return { id, voteCount: req.votes.size, voted: !alreadyVoted };
  }
}
