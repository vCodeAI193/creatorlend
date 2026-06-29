import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MarketingService {
  constructor(private readonly prisma: PrismaService) {}

  async syncToMailchimp(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, displayName: true } });
    if (!user) throw new Error('user_not_found');
    // Stub: in prod POST to Mailchimp Members API
    return { synced: true, email: user.email, list: 'creatorlend-users', isStub: true };
  }

  async unsubscribeFromMarketing(userId: string) {
    // Stub: remove from all lists
    return { unsubscribed: true, userId, isStub: true };
  }

  async trackEvent(userId: string, event: string, properties?: Record<string, unknown>) {
    // Stub: in prod send to Segment/Klaviyo
    return { tracked: true, userId, event, properties, isStub: true };
  }
}
