import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async block(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) throw new ConflictException('cannot_block_self');
    await this.prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });
    await this.prisma.follow.deleteMany({ where: { followerId: blockerId, artistId: blockedId } });
    return { blocked: true };
  }

  async unblock(blockerId: string, blockedId: string) {
    await this.prisma.block.deleteMany({ where: { blockerId, blockedId } });
    return { unblocked: true };
  }

  async list(blockerId: string) {
    return this.prisma.block.findMany({
      where: { blockerId },
      include: { blocked: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
  }
}
