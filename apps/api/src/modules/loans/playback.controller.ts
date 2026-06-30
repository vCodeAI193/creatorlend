import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { PlaybackPositionService } from './playback.service';

@Controller('playback')
@UseGuards(JwtAuthGuard)
export class PlaybackController {
  constructor(private readonly playback: PlaybackPositionService) {}

  @Put()
  updatePosition(
    @CurrentUser() userId: string,
    @Body('workId') workId: string,
    @Body('positionSeconds') positionSeconds: number,
    @Body('deviceId') deviceId?: string,
  ) {
    return this.playback.updatePosition(userId, workId, positionSeconds, deviceId);
  }

  // GET /api/v1/playback/sync/:workId – Cross-device sync status (F-276)
  @Get('sync/:workId')
  syncStatus(@CurrentUser() userId: string, @Param('workId') workId: string) {
    return this.playback.getDeviceSyncStatus(userId, workId);
  }

  @Get(':workId')
  getPosition(@CurrentUser() userId: string, @Param('workId') workId: string) {
    return this.playback.getPosition(userId, workId);
  }

  @Put(':workId/complete')
  markCompleted(@CurrentUser() userId: string, @Param('workId') workId: string) {
    return this.playback.markCompleted(userId, workId);
  }

  // GET /api/v1/playback/:workId/resume – Auto-Resume (F-275)
  @Get(':workId/resume')
  resume(@CurrentUser() userId: string, @Param('workId') workId: string) {
    return this.playback.getResumePosition(userId, workId);
  }

  // PUT /api/v1/playback/sleep-timer – Schlaf-Timer setzen (F-281)
  @Put('sleep-timer')
  setSleepTimer(@CurrentUser() userId: string, @Body('minutes') minutes: number | null) {
    return this.playback.setSleepTimer(userId, minutes ?? null);
  }

  // PUT /api/v1/playback/:workId/speed – Wiedergabegeschwindigkeit + Pitch-Korrektur (F-283/F-284)
  @Put(':workId/speed')
  setSpeed(
    @CurrentUser() userId: string,
    @Param('workId') workId: string,
    @Body('speed') speed: number,
  ) {
    return this.playback.setPlaybackSpeed(userId, workId, speed ?? 1.0);
  }

  // PUT /api/v1/playback/:workId/skip – 30s Rücksprung / Vorsprung (F-287)
  @Put(':workId/skip')
  skip(
    @CurrentUser() userId: string,
    @Param('workId') workId: string,
    @Body('deltaSeconds') deltaSeconds: number,
  ) {
    return this.playback.skip(userId, workId, deltaSeconds ?? 30);
  }

  // GET /api/v1/playback/queue – Wiedergabe-Queue (F-293)
  @Get('queue')
  getQueue(@CurrentUser() userId: string) {
    return this.playback.getQueue(userId);
  }

  // POST /api/v1/playback/queue – Werk zur Queue hinzufügen (F-293)
  @Post('queue')
  addToQueue(@CurrentUser() userId: string, @Body('workId') workId: string) {
    return this.playback.addToQueue(userId, workId);
  }

  // DELETE /api/v1/playback/queue/:workId – aus Queue entfernen (F-293)
  @Delete('queue/:workId')
  removeFromQueue(@CurrentUser() userId: string, @Param('workId') workId: string) {
    return this.playback.removeFromQueue(userId, workId);
  }

  // PUT /api/v1/playback/queue/reorder – Queue-Reihenfolge ändern (F-293)
  @Put('queue/reorder')
  reorderQueue(@CurrentUser() userId: string, @Body('orderedIds') orderedIds: string[]) {
    return this.playback.reorderQueue(userId, orderedIds ?? []);
  }

  // DELETE /api/v1/playback/queue – Queue leeren (F-293)
  @Delete('queue')
  clearQueue(@CurrentUser() userId: string) {
    return this.playback.clearQueue(userId);
  }
}
