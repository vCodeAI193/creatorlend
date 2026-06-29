import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { WebhooksSubscriptionService } from './webhooks.service';

@Controller('webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksSubscriptionController {
  constructor(private readonly webhooks: WebhooksSubscriptionService) {}

  @Get()
  list(@CurrentUser() userId: string) {
    return this.webhooks.list(userId);
  }

  @Post()
  create(
    @CurrentUser() userId: string,
    @Body('url') url: string,
    @Body('events') events: string[],
  ) {
    return this.webhooks.create(userId, url, events);
  }

  @Delete(':id')
  delete(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.webhooks.delete(userId, id);
  }

  // POST /api/v1/webhooks/zapier/subscribe – Store Zapier hook URL (F-887/F-888)
  @Post('zapier/subscribe')
  zapierSubscribe(
    @CurrentUser() userId: string,
    @Body('url') url: string,
    @Body('events') events: string[],
  ) {
    return this.webhooks.create(userId, url, events ?? ['*']);
  }

  // POST /api/v1/webhooks/ifttt/trigger – Trigger IFTTT applet (F-889/F-890)
  @Post('ifttt/trigger')
  iftttTrigger(
    @CurrentUser() userId: string,
    @Body('event') event: string,
    @Body('payload') payload: Record<string, unknown>,
  ) {
    return this.webhooks.dispatchToZapier(event ?? 'ifttt.trigger', payload ?? {});
  }
}
