import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  listCategories() {
    return this.prisma.workCategory.findMany({ include: { children: true }, where: { parentId: null } });
  }

  createCategory(name: string, slug: string, parentId?: string) {
    return this.prisma.workCategory.create({ data: { name, slug, parentId } });
  }

  assignCategory(workId: string, categoryId: string) {
    return this.prisma.workCategoryAssignment.upsert({
      where: { workId_categoryId: { workId, categoryId } },
      create: { workId, categoryId },
      update: {},
    });
  }

  removeCategory(workId: string, categoryId: string) {
    return this.prisma.workCategoryAssignment.deleteMany({ where: { workId, categoryId } });
  }

  getWorkCategories(workId: string) {
    return this.prisma.workCategoryAssignment.findMany({ where: { workId }, include: { category: true } });
  }
}
