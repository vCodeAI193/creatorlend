import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SavedSearchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, name: string, query: object, notify = false) {
    return this.prisma.savedSearch.create({ data: { userId, name, query, notify } });
  }

  async list(userId: string) {
    return this.prisma.savedSearch.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  }

  async remove(userId: string, id: string) {
    await this.prisma.savedSearch.deleteMany({ where: { id, userId } });
    return { deleted: true };
  }
}
