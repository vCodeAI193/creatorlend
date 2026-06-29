import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkNotesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(userId: string, workId: string, content: string) {
    return this.prisma.workNote.upsert({
      where: { userId_workId: { userId, workId } },
      create: { userId, workId, body: content },
      update: { body: content },
    });
  }

  async get(userId: string, workId: string) {
    const note = await this.prisma.workNote.findUnique({
      where: { userId_workId: { userId, workId } },
    });
    if (!note) throw new NotFoundException('note_not_found');
    return note;
  }

  async delete(userId: string, workId: string) {
    await this.prisma.workNote.deleteMany({ where: { userId, workId } });
    return { deleted: true };
  }
}
