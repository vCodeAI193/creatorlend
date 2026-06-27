import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@creatorlend/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import { WorksService } from "./works.service";
import { CreateWorkDto } from "./dto/create-work.dto";
import { UpdateWorkDto } from "./dto/update-work.dto";

@Controller("works")
export class WorksController {
  constructor(private readonly works: WorksService) {}

  // POST /api/v1/works – Werk einstellen (ARTIST)
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  create(@CurrentUser() userId: string, @Body() body: CreateWorkDto) {
    return this.works.create(userId, body);
  }

  // PATCH /api/v1/works/:id – Metadaten ändern (Eigentümer)
  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  update(
    @CurrentUser() userId: string,
    @Param("id") id: string,
    @Body() body: UpdateWorkDto,
  ) {
    return this.works.update(userId, id, body);
  }

  // POST /api/v1/works/:id/publish – veröffentlichen (ARTIST)
  @Post(":id/publish")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTIST)
  publish(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.works.publish(userId, id);
  }

  // GET /api/v1/works – Suche / Discovery (öffentlich)
  @Get()
  search(
    @Query("type") type?: string,
    @Query("q") q?: string,
    @Query("language") language?: string,
    @Query("category") category?: string,
    @Query("sort") sort?: string,
  ) {
    return this.works.search({ type, q, language, category, sort });
  }

  // GET /api/v1/works/:id – Detailansicht (öffentlich)
  @Get(":id")
  get(@Param("id") id: string) {
    return this.works.get(id);
  }
}
