import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { StreamingService } from './streaming.service';

@Controller('streaming')
@UseGuards(JwtAuthGuard)
export class StreamingController {
  constructor(private readonly streaming: StreamingService) {}

  // GET /api/v1/streaming/:workId/hls – HLS-Playlist-URL (F-958)
  @Get(':workId/hls')
  getHls(@Param('workId') workId: string, @CurrentUser() user: { userId: string }) {
    return this.streaming.getHlsPlaylist(user.userId, workId);
  }

  // GET /api/v1/streaming/:workId/variants – ABR-Varianten (F-959)
  @Get(':workId/variants')
  getVariants(@Param('workId') workId: string) {
    return this.streaming.getAbrVariants(workId);
  }

  // GET /api/v1/streaming/:workId/segments – Audio-Segmente (F-960)
  @Get(':workId/segments')
  getSegments(
    @Param('workId') workId: string,
    @Query('quality') quality: string,
    @Query('count') count: string,
  ) {
    return this.streaming.getSegmentUrls(workId, quality ?? 'HIGH', Number(count) || 10);
  }

  // GET /api/v1/streaming/:workId/state – Playback-Status (F-862)
  @Get(':workId/state')
  getState(@Param('workId') workId: string, @CurrentUser() user: { userId: string }) {
    return this.streaming.getPlaybackState(user.userId, workId);
  }
}
