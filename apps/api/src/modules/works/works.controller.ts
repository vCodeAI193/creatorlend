import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { WorksService } from "./works.service";

interface CreateWorkDto {
  title: string;
  type: string;
  description?: string;
  loanPriceCents: number;
  durationSeconds?: number;
  language?: string;
}

@Controller("works")
export class WorksController {
  constructor(private readonly works: WorksService) {}

  // POST /api/v1/works – Werk einstellen (ARTIST)
  @Post()
  create(@Req() req: { userId: string }, @Body() body: CreateWorkDto) {
    return this.works.create(req.userId, body);
  }

  // PATCH /api/v1/works/:id – Metadaten ändern (Eigentümer)
  @Patch(":id")
  update(
    @Req() req: { userId: string },
    @Param("id") id: string,
    @Body() body: Partial<CreateWorkDto>,
  ) {
    return this.works.update(req.userId, id, body);
  }

  // POST /api/v1/works/:id/publish – veröffentlichen
  @Post(":id/publish")
  publish(@Req() req: { userId: string }, @Param("id") id: string) {
    return this.works.publish(req.userId, id);
  }

  // GET /api/v1/works – Suche / Discovery (öffentlich)
  @Get()
  search(@Query("type") type?: string, @Query("q") q?: string) {
    return this.works.search({ type, q });
  }

  // GET /api/v1/works/:id – Detailansicht
  @Get(":id")
  get(@Param("id") id: string) {
    return this.works.get(id);
  }
}
