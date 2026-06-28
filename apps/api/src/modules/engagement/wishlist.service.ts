import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/** Wunschliste / „Später leihen" (B-031). */
@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work || work.status !== "PUBLISHED") throw new NotFoundException("work_not_found");
    try {
      return await this.prisma.wishlist.create({ data: { userId, workId } });
    } catch {
      throw new ConflictException("already_in_wishlist");
    }
  }

  async remove(userId: string, workId: string) {
    await this.prisma.wishlist.deleteMany({ where: { userId, workId } });
    return { removed: true };
  }

  async list(userId: string) {
    const items = await this.prisma.wishlist.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { work: true },
    });
    return items.map((i) => ({ ...i.work, addedAt: i.createdAt }));
  }
}
