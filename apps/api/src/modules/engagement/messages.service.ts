import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async send(senderId: string, recipientId: string, body: string) {
    const recipient = await this.prisma.user.findUnique({ where: { id: recipientId } });
    if (!recipient) throw new NotFoundException('recipient_not_found');
    const blocked = await this.prisma.block.findFirst({ where: { blockerId: recipientId, blockedId: senderId } });
    if (blocked) throw new NotFoundException('recipient_not_found');
    return this.prisma.directMessage.create({ data: { senderId, recipientId, body } });
  }

  async listConversation(userId: string, otherId: string) {
    return this.prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: otherId },
          { senderId: otherId, recipientId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listInbox(userId: string) {
    const msgs = await this.prisma.directMessage.findMany({
      where: { OR: [{ senderId: userId }, { recipientId: userId }] },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, displayName: true } },
        recipient: { select: { id: true, displayName: true } },
      },
    });
    const seen = new Set<string>();
    return msgs.filter(m => {
      const key = [m.senderId, m.recipientId].sort().join('-');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async markRead(userId: string, otherId: string) {
    await this.prisma.directMessage.updateMany({
      where: { senderId: otherId, recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { read: true };
  }
}
