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

  // F-629: Community newsletter opt-in/out
  async newsletterOptIn(userId: string, optIn: boolean) {
    const version = '1.0';
    await this.prisma.consentRecord.upsert({
      where: { id: `newsletter-${userId}` },
      create: { id: `newsletter-${userId}`, userId, type: 'NEWSLETTER', version, granted: optIn },
      update: { granted: optIn, version },
    });
    return { userId, newsletterOptIn: optIn };
  }

  async getNewsletterStatus(userId: string) {
    const record = await this.prisma.consentRecord.findFirst({
      where: { userId, type: 'NEWSLETTER' },
      orderBy: { createdAt: 'desc' },
    });
    return { userId, newsletterOptIn: record?.granted ?? false };
  }
}
