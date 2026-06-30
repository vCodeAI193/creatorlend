import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * Public webhook endpoint for email provider bounce/spam callbacks.
 * F-663: Bounce-Handling (SES/SendGrid).
 * F-664: Spam-Beschwerde-Handling.
 */
@Controller('webhooks/mail')
export class MailWebhookController {
  constructor(private readonly mail: MailService) {}

  // POST /api/v1/webhooks/mail/bounce – SES/SendGrid bounce callback (F-663)
  @Post('bounce')
  @HttpCode(200)
  async handleBounce(
    @Body() body: { email?: string; type?: string; reason?: string; Message?: string },
  ) {
    let email = body.email;
    let type: 'hard' | 'soft' = 'hard';
    let reason = body.reason;

    // SES bounce format (via SNS)
    if (body.Message) {
      try {
        const parsed = JSON.parse(body.Message) as Record<string, unknown>;
        const bounce = parsed.bounce as Record<string, unknown> | undefined;
        const recipients = bounce?.bouncedRecipients as Array<{ emailAddress: string }> | undefined;
        email = recipients?.[0]?.emailAddress ?? email;
        type = (bounce?.bounceType as string ?? 'Permanent') === 'Transient' ? 'soft' : 'hard';
      } catch { /* non-JSON body */ }
    }
    // SendGrid bounce format
    if (!email && body.type) type = body.type === 'blocked' ? 'soft' : 'hard';

    if (email) await this.mail.handleBounce(email, type, reason);
    return { ok: true };
  }

  // POST /api/v1/webhooks/mail/spam – SES/SendGrid spam complaint callback (F-664)
  @Post('spam')
  @HttpCode(200)
  async handleSpam(
    @Body() body: { email?: string; source?: string; Message?: string },
  ) {
    let email = body.email;
    let source = body.source;

    // SES complaint format (via SNS)
    if (body.Message) {
      try {
        const parsed = JSON.parse(body.Message) as Record<string, unknown>;
        const complaint = parsed.complaint as Record<string, unknown> | undefined;
        const recipients = complaint?.complainedRecipients as Array<{ emailAddress: string }> | undefined;
        email = recipients?.[0]?.emailAddress ?? email;
        source = (parsed.source as string) ?? source;
      } catch { /* non-JSON body */ }
    }

    if (email) await this.mail.handleSpamComplaint(email, source);
    return { ok: true };
  }
}
