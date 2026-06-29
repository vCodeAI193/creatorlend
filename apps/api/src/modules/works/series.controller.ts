import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@creatorlend/shared';
import { CurrentUser } from '../../common/current-user.decorator';
import { SeriesService } from './series.service';

@Controller('series')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SeriesController {
  constructor(private readonly series: SeriesService) {}

  @Post()
  @Roles(UserRole.ARTIST)
  create(@CurrentUser() userId: string, @Body() body: { title: string; description?: string }) {
    return this.series.create(userId, body);
  }

  @Get('me')
  @Roles(UserRole.ARTIST)
  list(@CurrentUser() userId: string) {
    return this.series.list(userId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.series.get(id);
  }

  @Post(':id/works')
  @Roles(UserRole.ARTIST)
  addWork(@CurrentUser() userId: string, @Param('id') seriesId: string, @Body() body: { workId: string; position?: number }) {
    return this.series.addWork(userId, seriesId, body.workId, body.position);
  }

  @Delete(':id/works/:workId')
  @Roles(UserRole.ARTIST)
  removeWork(@CurrentUser() userId: string, @Param('id') seriesId: string, @Param('workId') workId: string) {
    return this.series.removeWork(userId, seriesId, workId);
  }

  @Delete(':id')
  @Roles(UserRole.ARTIST)
  delete(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.series.delete(userId, id);
  }
}
