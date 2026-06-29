import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CurrentUser } from "../../common/current-user.decorator";
import { ApiKeysService } from "./api-keys.service";

@Controller("auth/api-keys")
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  // POST /api/v1/auth/api-keys – API-Key erstellen (F-031)
  @Post()
  create(
    @CurrentUser() userId: string,
    @Body()
    body: {
      name: string;
      scopes?: string[];
      expiresAt?: string;
    },
  ) {
    return this.apiKeys.create(
      userId,
      body.name,
      body.scopes ?? [],
      body.expiresAt ? new Date(body.expiresAt) : undefined,
    );
  }

  // GET /api/v1/auth/api-keys – API-Keys auflisten (F-031)
  @Get()
  list(@CurrentUser() userId: string) {
    return this.apiKeys.list(userId);
  }

  // DELETE /api/v1/auth/api-keys/:id – API-Key widerrufen (F-031)
  @Delete(":id")
  @HttpCode(200)
  revoke(@CurrentUser() userId: string, @Param("id") keyId: string) {
    return this.apiKeys.revoke(userId, keyId);
  }
}
