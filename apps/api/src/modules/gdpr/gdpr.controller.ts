import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../../common/current-user.decorator';
import { GdprService } from './gdpr.service';
import { UserRole } from '@creatorlend/shared';

@Controller('gdpr')
@UseGuards(JwtAuthGuard)
export class GdprController {
  constructor(private readonly gdpr: GdprService) {}

  // POST /api/v1/gdpr/export – Datenexport anfordern (F-747)
  @Post('export')
  requestDataExport(@CurrentUser() userId: string) {
    return this.gdpr.requestDataExport(userId);
  }

  // GET /api/v1/gdpr/export/data – Daten abrufen (F-747)
  @Get('export/data')
  exportUserData(@CurrentUser() userId: string) {
    return this.gdpr.exportUserData(userId);
  }

  // POST /api/v1/gdpr/delete – Löschanfrage (F-748)
  @Post('delete')
  requestDeletion(@CurrentUser() userId: string) {
    return this.gdpr.requestDeletion(userId);
  }

  // GET /api/v1/gdpr/requests – Eigene Anfragen (F-747)
  @Get('requests')
  listUserRequests(@CurrentUser() userId: string) {
    return this.gdpr.listUserRequests(userId);
  }

  // POST /api/v1/gdpr/ccpa/opt-out – CCPA Opt-Out (F-946)
  @Post('ccpa/opt-out')
  ccpaOptOut(@CurrentUser() user: { userId: string }) {
    return this.gdpr.ccpaOptOut(user.userId);
  }

  // GET /api/v1/gdpr/ccpa/status – CCPA-Status (F-946)
  @Get('ccpa/status')
  ccpaStatus(@CurrentUser() user: { userId: string }) {
    return this.gdpr.getCcpaStatus(user.userId);
  }
}

@Controller('admin/gdpr')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminGdprController {
  constructor(private readonly gdpr: GdprService) {}

  // GET /api/v1/admin/gdpr/pending – Offene DSGVO-Anfragen (F-747)
  @Get('pending')
  listPendingRequests() {
    return this.gdpr.listPendingRequests();
  }

  // PATCH /api/v1/admin/gdpr/:id/complete – Anfrage abschließen (F-747)
  @Patch(':id/complete')
  completeRequest(
    @CurrentUser() adminId: string,
    @Param('id') id: string,
    @Body('downloadUrl') downloadUrl?: string,
  ) {
    return this.gdpr.completeRequest(adminId, id, downloadUrl);
  }

  // GET /api/v1/admin/gdpr/dsfa – DSFA-Status (F-948)
  @Get('dsfa')
  getDsfa() {
    return this.gdpr.getDsfaStatus();
  }
}
