import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../../common/current-user.decorator';
import { SurveysService } from './surveys.service';
import { UserRole } from '@creatorlend/shared';

@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveys: SurveysService) {}

  // POST /api/v1/surveys/nps – NPS einreichen (F-809, kein Auth erforderlich)
  @Post('nps')
  submitNps(
    @Body('userId') userId: string,
    @Body('score') score: number,
    @Body('comment') comment?: string,
  ) {
    return this.surveys.submitNps(userId, score, comment);
  }

  // POST /api/v1/surveys/events – Custom-Event tracken (F-800, kein Auth)
  @Post('events')
  trackEvent(
    @Body('userId') userId: string | undefined,
    @Body('eventName') eventName: string,
    @Body('properties') properties?: Prisma.InputJsonValue,
    @Body('sessionId') sessionId?: string,
  ) {
    return this.surveys.trackEvent(userId, eventName, properties, sessionId);
  }
}

@Controller('admin/surveys')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminSurveysController {
  constructor(private readonly surveys: SurveysService) {}

  // GET /api/v1/admin/surveys/nps – NPS-Statistiken (F-809)
  @Get('nps')
  getNpsStats() {
    return this.surveys.getNpsStats();
  }

  // GET /api/v1/admin/surveys/events – Event-Typen auflisten (F-800)
  @Get('events')
  listEventTypes() {
    return this.surveys.listEventTypes();
  }

  // GET /api/v1/admin/surveys/events/stats?eventName=... – Event-Statistiken (F-800)
  @Get('events/stats')
  getEventStats(@Query('eventName') eventName: string, @Query('from') from?: string) {
    return this.surveys.getEventStats(eventName, from);
  }
}
