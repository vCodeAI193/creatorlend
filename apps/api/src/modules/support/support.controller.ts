import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
}
