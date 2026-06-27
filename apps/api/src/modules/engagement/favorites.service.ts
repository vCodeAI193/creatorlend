import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work) throw new NotFoundException("work_not_found");
    try {
      return await this.prisma.favorite.create({ data: { userId, workId } });
    } catch {
      throw new ConflictException("already_favorited");
    }
  }

  async remove(userId: string, workId: string) {
    await this.prisma.favorite.deleteMany({ where: { userId, workId } });
    return { removed: true };
  }

  async list(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { work: true },
    });
    return favorites.map((f) => f.work);
  }
}
