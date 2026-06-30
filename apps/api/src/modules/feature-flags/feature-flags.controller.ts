import { Body, Controller, Delete, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../../common/current-user.decorator';
import { FeatureFlagsService } from './feature-flags.service';
import { UserRole } from '@creatorlend/shared';

// GET /api/v1/feature-flags?userId=... – flags für aktuellen Nutzer (F-970)
@Controller('feature-flags')
@UseGuards(JwtAuthGuard)
export class FeatureFlagsController {
  constructor(private readonly ff: FeatureFlagsService) {}

  @Get()
  getFlagsForUser(@CurrentUser() user: { userId: string }) {
    return this.ff.getFlagsForUser(user.userId);
  }

  @Get(':key')
  getFlag(@Param('key') key: string, @CurrentUser() user: { userId: string }) {
    return this.ff.isEnabled(key, user.userId).then((enabled) => ({ key, enabled }));
  }
}

// Admin-Verwaltung (F-743)
@Controller('admin/feature-flags')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminFeatureFlagsController {
  constructor(private readonly ff: FeatureFlagsService) {}

  @Get()
  list() {
    return this.ff.listFlags();
  }

  @Put(':key')
  upsert(
    @Param('key') key: string,
    @Body('enabled') enabled: boolean,
    @Body('description') description?: string,
    @Body('rolloutPct') rolloutPct?: number,
  ) {
    return this.ff.upsertFlag(key, enabled, description, rolloutPct);
  }

  @Delete(':key')
  remove(@Param('key') key: string) {
    return this.ff.deleteFlag(key);
  }
}
