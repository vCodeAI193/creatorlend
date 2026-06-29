import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Post()
  send(@CurrentUser() userId: string, @Body() body: { recipientId: string; body: string }) {
    return this.messages.send(userId, body.recipientId, body.body);
  }

  @Get()
  inbox(@CurrentUser() userId: string) {
    return this.messages.listInbox(userId);
  }

  @Get(':userId')
  conversation(@CurrentUser() userId: string, @Param('userId') otherId: string) {
    return this.messages.listConversation(userId, otherId);
  }

  @Post(':userId/read')
  markRead(@CurrentUser() userId: string, @Param('userId') otherId: string) {
    return this.messages.markRead(userId, otherId);
  }

  @Post('recommend')
  recommend(
    @CurrentUser() userId: string,
    @Body() body: { recipientId: string; workId: string; message?: string },
  ) {
    return this.messages.recommendWork(userId, body.recipientId, body.workId, body.message);
  }

  // POST /api/v1/messages/encrypted – E2E-verschlüsselte DM senden (F-940)
  @Post('encrypted')
  sendEncrypted(
    @CurrentUser() userId: string,
    @Body() body: { recipientId: string; encryptedBody: string },
  ) {
    return this.messages.sendEncrypted(userId, body.recipientId, body.encryptedBody);
  }
}
