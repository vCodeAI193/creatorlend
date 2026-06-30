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

  // F-669: Automatisiertes E-Mail-Sequenz-Management
  private readonly sequences: Record<string, Array<{ stepName: string; delayHours: number; subject: string }>> = {
    welcome: [
      { stepName: 'welcome_day0', delayHours: 0, subject: 'Willkommen bei CreatorLend!' },
      { stepName: 'welcome_day3', delayHours: 72, subject: 'Entdecke die besten Werke' },
      { stepName: 'welcome_day7', delayHours: 168, subject: 'Dein erster Monat – was läuft?' },
    ],
    winback: [
      { stepName: 'winback_day0', delayHours: 0, subject: 'Wir vermissen dich!' },
      { stepName: 'winback_day3', delayHours: 72, subject: 'Exklusives Angebot nur für dich' },
    ],
    re_engagement: [
      { stepName: 're_engagement_day0', delayHours: 0, subject: 'Schon lange nicht gehört…' },
      { stepName: 're_engagement_day7', delayHours: 168, subject: 'Neue Werke warten auf dich' },
    ],
    post_borrow: [
      { stepName: 'post_borrow_day1', delayHours: 24, subject: 'Wie gefällt dir das Werk?' },
    ],
  };

  getAvailableSequences() {
    return Object.entries(this.sequences).map(([name, steps]) => ({
      name,
      stepCount: steps.length,
      steps: steps.map((s) => ({ name: s.stepName, delayHours: s.delayHours, subject: s.subject })),
    }));
  }

  triggerSequence(userId: string, sequenceName: string) {
    const sequence = this.sequences[sequenceName];
    if (!sequence) return { triggered: false, error: 'unknown_sequence' };
    return {
      triggered: true,
      userId,
      sequenceName,
      stepCount: sequence.length,
      message: `Sequence "${sequenceName}" queued for userId=${userId}. In production, schedule BullMQ jobs for each step.`,
    };
  }

  cancelSequence(userId: string, sequenceName: string) {
    return { cancelled: true, userId, sequenceName };
  }
}
