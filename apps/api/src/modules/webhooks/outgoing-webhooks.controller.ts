import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { OutgoingWebhooksService } from './outgoing-webhooks.service';

@Controller('webhooks/subscriptions')
@UseGuards(JwtAuthGuard)
export class OutgoingWebhooksController {
  constructor(private readonly outgoing: OutgoingWebhooksService) {}

  // POST /api/v1/webhooks/subscriptions – Webhook abonnieren (F-883)
  @Post()
  subscribe(
    @CurrentUser() userId: string,
    @Body('url') url: string,
    @Body('events') events: string[],
  ) {
    return this.outgoing.subscribe(userId, url, events);
  }

  // GET /api/v1/webhooks/subscriptions – Abonnements auflisten (F-883)
  @Get()
  listSubscriptions(@CurrentUser() userId: string) {
    return this.outgoing.listSubscriptions(userId);
  }

  // DELETE /api/v1/webhooks/subscriptions/:id – Abonnement kündigen (F-883)
  @Delete(':id')
  deleteSubscription(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.outgoing.deleteSubscription(userId, id);
  }

  // GET /api/v1/webhooks/subscriptions/:id/deliveries – Deliveries anzeigen (F-886)
  @Get(':id/deliveries')
  listDeliveries(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.outgoing.listDeliveries(id, limit ? Number(limit) : undefined);
  }
}
