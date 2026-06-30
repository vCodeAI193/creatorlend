import { Injectable, Logger } from "@nestjs/common";

interface MailMessage {
  to: string;
  subject: string;
  body: string;
}

/**
 * Mail-Versand-Abstraktion (Start von B-119). Im Dev-Modus wird die Mail
 * nur geloggt (und intern gemerkt); in Produktion bindet hier ein echter
 * Provider an (SES/Postmark/…). Die Service-Schnittstelle bleibt gleich.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async send(message: MailMessage): Promise<void> {
    // TODO: echten Provider anbinden (B-119/B-120).
    this.logger.log(`[MAIL] an ${message.to}: ${message.subject}`);
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
}
