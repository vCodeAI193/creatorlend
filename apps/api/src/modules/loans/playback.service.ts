import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlaybackPositionService {
  constructor(private readonly prisma: PrismaService) {}

  async updatePosition(userId: string, workId: string, positionSeconds: number) {
    return this.prisma.playbackPosition.upsert({
      where: { userId_workId: { userId, workId } },
      create: { userId, workId, positionSeconds },
      update: { positionSeconds },
    });
  }

  async getPosition(userId: string, workId: string) {
    const pos = await this.prisma.playbackPosition.findUnique({
      where: { userId_workId: { userId, workId } },
    });
    if (!pos) throw new NotFoundException('position_not_found');
    return pos;
  }

  async markCompleted(userId: string, workId: string) {
    return this.prisma.playbackPosition.upsert({
      where: { userId_workId: { userId, workId } },
      create: { userId, workId, positionSeconds: 0, completedAt: new Date() },
      update: { completedAt: new Date() },
    });
  }
}
