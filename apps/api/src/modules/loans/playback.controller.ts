import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
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
  ) {
    return this.playback.updatePosition(userId, workId, positionSeconds);
  }

  @Get(':workId')
  getPosition(@CurrentUser() userId: string, @Param('workId') workId: string) {
    return this.playback.getPosition(userId, workId);
  }

  @Put(':workId/complete')
  markCompleted(@CurrentUser() userId: string, @Param('workId') workId: string) {
    return this.playback.markCompleted(userId, workId);
  }
}
