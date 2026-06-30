import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../../common/current-user.decorator';
import { SupportService } from './support.service';
import { UserRole } from '@creatorlend/shared';

@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly support: SupportService) {}

  // POST /api/v1/support – Ticket erstellen (F-693)
  @Post()
  createTicket(
    @CurrentUser() userId: string,
    @Body('subject') subject: string,
    @Body('body') body: string,
    @Body('priority') priority?: string,
  ) {
    return this.support.createTicket(userId, subject, body, priority);
  }

  // GET /api/v1/support – Eigene Tickets (F-693)
  @Get()
  listTickets(@CurrentUser() userId: string) {
    return this.support.listTickets(userId);
  }

  // GET /api/v1/support/:id – Ticket abrufen (F-693)
  @Get(':id')
  getTicket(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.support.getTicket(userId, id);
  }

  // POST /api/v1/support/:id/csat – CSAT einreichen (F-700)
  @Post(':id/csat')
  submitCsat(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body('score') score: number,
  ) {
    return this.support.submitCsat(userId, id, score);
  }

  // GET /api/v1/support/feature-requests – Community-Feature-Requests (F-605)
  @Get('feature-requests')
  listFeatureRequests(@Query('sortBy') sortBy?: 'votes' | 'newest') {
    return this.support.listFeatureRequests(sortBy ?? 'votes');
  }

  // POST /api/v1/support/feature-requests – Feature-Request erstellen (F-605)
  @Post('feature-requests')
  createFeatureRequest(
    @CurrentUser() userId: string,
    @Body('title') title: string,
    @Body('description') description: string,
  ) {
    return this.support.createFeatureRequest(userId, title, description ?? '');
  }

  // PUT /api/v1/support/feature-requests/:id/vote – Feature-Request abstimmen (F-605)
  @Put('feature-requests/:id/vote')
  voteFeatureRequest(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.support.voteFeatureRequest(userId, id);
  }

  // POST /api/v1/support/bug-report – Bug-Report einreichen (F-607)
  @Post('bug-report')
  createBugReport(
    @CurrentUser() userId: string,
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('metadata') metadata?: Record<string, unknown>,
  ) {
    return this.support.createBugReport(userId, title, description, metadata);
  }

  // POST /api/v1/support/chat – In-App Chat starten (F-691)
  @Post('chat')
  startChat(@CurrentUser() userId: string, @Body('message') message: string) {
    return this.support.startChatSession(userId, message ?? '');
  }

  // POST /api/v1/support/chat/:sessionId/message – Chat-Nachricht senden (F-691)
  @Post('chat/:sessionId/message')
  sendChatMessage(
    @CurrentUser() userId: string,
    @Param('sessionId') sessionId: string,
    @Body('message') message: string,
  ) {
    return this.support.sendChatMessage(userId, sessionId, message);
  }

  // POST /api/v1/support/chatbot – Chatbot-Frage stellen (F-692)
  @Post('chatbot')
  chatbot(@Body('message') message: string) {
    return this.support.chatbotResponse(message ?? '');
  }
}

@Controller('admin/support')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminSupportController {
  constructor(private readonly support: SupportService) {}

  // GET /api/v1/admin/support – Alle Tickets (F-693)
  @Get()
  listAllTickets(@Query('status') status?: string, @Query('assigneeId') assigneeId?: string) {
    return this.support.listAllTickets(status, assigneeId);
  }

  // GET /api/v1/admin/support/sla-breaches – SLA-Verstöße (F-694)
  @Get('sla-breaches')
  listSlaBreaches() {
    return this.support.listSlaBreaches();
  }

  // PATCH /api/v1/admin/support/:id – Status aktualisieren (F-693)
  @Patch(':id')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('assigneeId') assigneeId?: string,
  ) {
    return this.support.updateStatus(id, status, assigneeId);
  }

  // POST /api/v1/admin/support/users/:id/shadow-ban – Shadow-Banning (F-626)
  @Post('users/:id/shadow-ban')
  shadowBan(@Param('id') id: string) {
    return this.support.shadowBan(id);
  }

  // DELETE /api/v1/admin/support/users/:id/shadow-ban – Shadow-Ban aufheben (F-626)
  @Delete('users/:id/shadow-ban')
  removeShadowBan(@Param('id') id: string) {
    return this.support.removeShadowBan(id);
  }

  // GET /api/v1/admin/support/users/:id/trolling-check – Trolling-Erkennung (F-625)
  @Get('users/:id/trolling-check')
  checkTrolling(@Param('id') id: string) {
    return this.support.checkTrollingPattern(id);
  }
}
