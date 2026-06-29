import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { WorkNotesService } from './work-notes.service';

@Controller('work-notes')
@UseGuards(JwtAuthGuard)
export class WorkNotesController {
  constructor(private readonly workNotes: WorkNotesService) {}

  @Put()
  upsert(
    @CurrentUser() userId: string,
    @Body('workId') workId: string,
    @Body('content') content: string,
  ) {
    return this.workNotes.upsert(userId, workId, content);
  }

  @Get(':workId')
  get(@CurrentUser() userId: string, @Param('workId') workId: string) {
    return this.workNotes.get(userId, workId);
  }

  @Delete(':workId')
  delete(@CurrentUser() userId: string, @Param('workId') workId: string) {
    return this.workNotes.delete(userId, workId);
  }
}
