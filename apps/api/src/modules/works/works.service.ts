import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MediaService } from "../media/media.service";

interface CreateWorkInput {
  title: string;
  type: string;
  description?: string;
  loanPriceCents: number;
  durationSeconds?: number;
  language?: string;
}

@Injectable()
export class WorksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  /**
   * Legt ein Werk im Status DRAFT an. Der eigentliche Datei-Upload erfolgt
   * über eine signierte Upload-URL (siehe MediaService – Platzhalter).
   */
  async create(artistId: string, input: CreateWorkInput) {
    const work = await this.prisma.work.create({
      data: {
        artistId,
        title: input.title,
        type: input.type as never,
        description: input.description,
        loanPriceCents: input.loanPriceCents,
        durationSeconds: input.durationSeconds,
        language: input.language,
        status: "DRAFT",
      },
    });

    return {
      ...work,
      upload: this.media.getUploadUrl(work.id),
    };
  }

  private async ownedWork(artistId: string, id: string) {
    const work = await this.prisma.work.findUnique({ where: { id } });
    if (!work) throw new NotFoundException("work_not_found");
    if (work.artistId !== artistId) throw new ForbiddenException("not_owner");
    return work;
  }

  async update(artistId: string, id: string, input: Partial<CreateWorkInput>) {
    await this.ownedWork(artistId, id);
    return this.prisma.work.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        loanPriceCents: input.loanPriceCents,
        durationSeconds: input.durationSeconds,
        language: input.language,
        ...(input.type ? { type: input.type as never } : {}),
      },
    });
  }

  async publish(artistId: string, id: string) {
    await this.ownedWork(artistId, id);
    return this.prisma.work.update({
      where: { id },
      data: { status: "PUBLISHED" },
    });
  }

  search(filter: { type?: string; q?: string }) {
    return this.prisma.work.findMany({
      where: {
        status: "PUBLISHED",
        ...(filter.type ? { type: filter.type as never } : {}),
        ...(filter.q ? { title: { contains: filter.q, mode: "insensitive" } } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(id: string) {
    const work = await this.prisma.work.findUnique({ where: { id } });
    if (!work) throw new NotFoundException("work_not_found");
    return work;
  }
}
