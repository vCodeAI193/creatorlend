import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, title: string, description?: string, isPublic?: boolean) {
    return this.prisma.collection.create({ data: { userId, title, description, isPublic: isPublic ?? false } });
  }

  async update(userId: string, id: string, data: { title?: string; description?: string; isPublic?: boolean }) {
    const col = await this.prisma.collection.findUnique({ where: { id } });
    if (!col) throw new NotFoundException('collection_not_found');
    if (col.userId !== userId) throw new ForbiddenException('not_your_collection');
    return this.prisma.collection.update({ where: { id }, data });
  }

  async delete(userId: string, id: string) {
    const col = await this.prisma.collection.findUnique({ where: { id } });
    if (!col) throw new NotFoundException('collection_not_found');
    if (col.userId !== userId) throw new ForbiddenException('not_your_collection');
    await this.prisma.collection.delete({ where: { id } });
    return { deleted: true };
  }

  async addWork(userId: string, collectionId: string, workId: string) {
    const col = await this.prisma.collection.findUnique({ where: { id: collectionId } });
    if (!col) throw new NotFoundException('collection_not_found');
    if (col.userId !== userId) throw new ForbiddenException('not_your_collection');
    return this.prisma.collectionItem.upsert({
      where: { collectionId_workId: { collectionId, workId } },
      create: { collectionId, workId },
      update: {},
    });
  }

  async removeWork(userId: string, collectionId: string, workId: string) {
    const col = await this.prisma.collection.findUnique({ where: { id: collectionId } });
    if (!col) throw new NotFoundException('collection_not_found');
    if (col.userId !== userId) throw new ForbiddenException('not_your_collection');
    await this.prisma.collectionItem.deleteMany({ where: { collectionId, workId } });
    return { removed: true };
  }

  async list(userId: string) {
    return this.prisma.collection.findMany({
      where: { userId },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPublic(collectionId: string, requesterId?: string) {
    const col = await this.prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        items: {
          include: { work: { select: { id: true, title: true, type: true, loanPriceCents: true } } },
          orderBy: { sortOrder: 'asc' },
        },
        user: { select: { id: true, displayName: true } },
      },
    });
    if (!col) throw new NotFoundException('collection_not_found');
    if (!col.isPublic && col.userId !== requesterId) throw new ForbiddenException('collection_private');
    return col;
  }
}
