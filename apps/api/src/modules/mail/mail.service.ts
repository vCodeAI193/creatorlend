import { Injectable, Logger } from "@nestjs/common";

interface MailMessage {
  to: string;
  subject: string;
  body: string;
}

/**
 * Mail-Versand-Abstraktion (B-119/B-120/F-662).
 * Dev-Modus: loggt E-Mails nur.
 * Production: set MAIL_PROVIDER=ses|sendgrid + credentials, then swap send() implementation.
 * F-662: AWS SES via @aws-sdk/client-ses or SendGrid via @sendgrid/mail.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly provider = process.env.MAIL_PROVIDER ?? 'log'; // 'ses' | 'sendgrid' | 'log'
  private readonly fromAddress = process.env.MAIL_FROM ?? 'noreply@creatorlend.com';

  async send(message: MailMessage): Promise<void> {
    if (this.provider === 'ses') {
      // F-662: AWS SES – install @aws-sdk/client-ses
      // const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');
      // const ses = new SESClient({ region: process.env.AWS_REGION ?? 'eu-central-1' });
      // await ses.send(new SendEmailCommand({ Source: this.fromAddress, Destination: { ToAddresses: [message.to] }, Message: { Subject: { Data: message.subject }, Body: { Text: { Data: message.body } } } }));
      this.logger.log(`[SES-STUB] To: ${message.to} | Subject: ${message.subject}`);
    } else if (this.provider === 'sendgrid') {
      // F-662: SendGrid fallback – install @sendgrid/mail
      // const sgMail = await import('@sendgrid/mail');
      // sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
      // await sgMail.send({ to: message.to, from: this.fromAddress, subject: message.subject, text: message.body });
      this.logger.log(`[SENDGRID-STUB] To: ${message.to} | Subject: ${message.subject}`);
    } else {
      this.logger.log(`[MAIL] an ${message.to}: ${message.subject}`);
    }
  }

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    await this.send({ to, subject, body });
  }

  async sendVerifyEmail(to: string, token: string): Promise<void> {
    await this.send({
      to,
      subject: "Bestätige deine E-Mail-Adresse",
      body: `Bestätige dein Konto mit diesem Token: ${token}`,
    });
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    await this.send({
      to,
      subject: "Passwort zurücksetzen",
      body: `Setze dein Passwort mit diesem Token zurück: ${token}`,
    });
  }

  // F-010: Neue Geräteanmeldung-Benachrichtigung
  async sendNewDeviceLoginEmail(to: string, ip?: string, userAgent?: string): Promise<void> {
    await this.send({
      to,
      subject: 'Neue Anmeldung bei CreatorLend',
      body: `Wir haben eine neue Anmeldung in deinem Konto erkannt.\nIP: ${ip ?? 'unbekannt'}\nGerät: ${userAgent?.substring(0, 100) ?? 'unbekannt'}\nFalls du das nicht warst, ändere sofort dein Passwort.`,
    });
  }

  // F-011: Verdächtige Anmeldung
  async sendSuspiciousLoginEmail(to: string, ip?: string, userAgent?: string): Promise<void> {
    await this.send({
      to,
      subject: 'Verdächtige Anmeldung bei CreatorLend',
      body: `Wir haben eine verdächtige Anmeldung von einer unbekannten IP-Adresse erkannt.\nIP: ${ip ?? 'unbekannt'}\nGerät: ${userAgent?.substring(0, 100) ?? 'unbekannt'}\nFalls du das nicht warst, sichere sofort dein Konto.`,
    });
  }

  // F-020: E-Mail-Änderung Verifizierung
  async sendEmailChangeVerification(to: string, token: string): Promise<void> {
    await this.send({
      to,
      subject: 'Bestätige deine neue E-Mail-Adresse',
      body: `Bestätige deine neue E-Mail-Adresse mit diesem Token: ${token}`,
    });
  }

  // F-652: Personalisierte E-Mail mit Vorname + erstem Werk
  async sendPersonalizedWelcome(to: string, displayName: string, firstWorkTitle?: string): Promise<void> {
    const firstName = displayName.split(' ')[0];
    const workPart = firstWorkTitle ? `\n\nDein erstes Werk "${firstWorkTitle}" ist bereits online!` : '';
    await this.send({
      to,
      subject: `Willkommen bei CreatorLend, ${firstName}!`,
      body: `Hallo ${firstName},\n\nwir freuen uns, dass du dabei bist.${workPart}\n\nViel Erfolg auf CreatorLend!\nDein CreatorLend-Team`,
    });
  }

  // F-653: Transaktions-E-Mail: Leih-Bestätigung
  async sendLoanConfirmation(to: string, displayName: string, workTitle: string, expiresAt: Date): Promise<void> {
    const firstName = displayName.split(' ')[0];
    await this.send({
      to,
      subject: `Deine Leihe: "${workTitle}"`,
      body: `Hallo ${firstName},\n\ndu hast "${workTitle}" erfolgreich geliehen.\nDie Leihe läuft bis: ${expiresAt.toLocaleDateString('de-DE')}.\n\nViel Freude beim Hören!\nDein CreatorLend-Team`,
    });
  }

  // F-653: Transaktions-E-Mail: Abo-Bestätigung
  async sendSubscriptionConfirmation(to: string, displayName: string, plan: string): Promise<void> {
    const firstName = displayName.split(' ')[0];
    await this.send({
      to,
      subject: `Dein ${plan}-Abo ist aktiv!`,
      body: `Hallo ${firstName},\n\ndein ${plan}-Abonnement bei CreatorLend ist nun aktiv. Du kannst sofort Werke leihen.\n\nVielen Dank für dein Vertrauen!\nDein CreatorLend-Team`,
    });
  }

  // F-654: Erinnerungs-E-Mail: Leihe läuft ab
  async sendLoanExpiryReminder(to: string, displayName: string, workTitle: string, expiresAt: Date): Promise<void> {
    const firstName = displayName.split(' ')[0];
    const hoursLeft = Math.round((expiresAt.getTime() - Date.now()) / 3_600_000);
    await this.send({
      to,
      subject: `Deine Leihe von "${workTitle}" läuft bald ab`,
      body: `Hallo ${firstName},\n\nDeine Leihe von "${workTitle}" läuft in ${hoursLeft} Stunden ab (${expiresAt.toLocaleDateString('de-DE')}).\n\nJetzt verlängern: ${process.env.WEB_BASE_URL ?? 'https://creatorlend.com'}/loans\n\nDein CreatorLend-Team`,
    });
  }

  // F-654: Erinnerungs-E-Mail: Abo verlängert sich
  async sendSubscriptionRenewalReminder(to: string, displayName: string, renewalDate: Date, plan: string): Promise<void> {
    const firstName = displayName.split(' ')[0];
    await this.send({
      to,
      subject: 'Dein CreatorLend-Abo verlängert sich',
      body: `Hallo ${firstName},\n\nDein ${plan}-Abonnement verlängert sich am ${renewalDate.toLocaleDateString('de-DE')} automatisch.\n\nAbo verwalten: ${process.env.WEB_BASE_URL ?? 'https://creatorlend.com'}/account/subscription\n\nDein CreatorLend-Team`,
    });
  }

  // F-663: Bounce-Handling – ungültige E-Mails deaktivieren
  async handleBounce(email: string, bounceType: 'hard' | 'soft', reason?: string): Promise<void> {
    this.logger.warn(`[BOUNCE] ${bounceType} bounce for ${email}: ${reason ?? 'unknown'}`);
    // Production: update user.emailBounced = true in DB; unsubscribe from non-transactional emails
    // SES: parse SNS notification from https://docs.aws.amazon.com/ses/latest/dg/notification-contents.html
    // SendGrid: parse webhook event type "bounce" from https://docs.sendgrid.com/for-developers/tracking-events/event
  }

  // F-664: Spam-Beschwerde-Handling (Feedback-Loop)
  async handleSpamComplaint(email: string, source?: string): Promise<void> {
    this.logger.warn(`[SPAM_COMPLAINT] complaint for ${email} from ${source ?? 'unknown'}`);
    // Production: immediately unsubscribe email from all marketing; keep only critical transactional
    // SES: parse SNS complaint notification; SendGrid: parse webhook event type "spamreport"
  }

  // F-419: Preiserhöhungs-Ankündigung 30 Tage vorher
  async sendPriceIncreaseNotification(to: string, displayName: string, newPriceCents: number, effectiveDate: Date): Promise<void> {
    const firstName = displayName.split(' ')[0];
    await this.send({
      to,
      subject: 'Wichtige Information: Preisänderung bei CreatorLend',
      body: `Hallo ${firstName},\n\nab dem ${effectiveDate.toLocaleDateString('de-DE')} ändert sich der Preis für dein Abo auf ${(newPriceCents / 100).toFixed(2)} €/Monat.\n\nBis dahin genießt du deinen aktuellen Preis ohne Änderungen.\n\nFragen? Schreib uns: support@creatorlend.com\n\nDein CreatorLend-Team`,
    });
  }
}
