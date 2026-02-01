import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { join } from 'path';

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  private loadTemplate(templateName: string, context: Record<string, any>): string {
    try {
      const templatePath = join(__dirname, '..', 'templates', 'email', `${templateName}.html`);
      let template = readFileSync(templatePath, 'utf-8');

      // Simple template replacement
      Object.keys(context).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        template = template.replace(regex, String(context[key]));
      });

      return template;
    } catch (error) {
      console.error(`Failed to load email template: ${templateName}`, error);
      throw new Error(`Email template not found: ${templateName}`);
    }
  }

  private async send(options: EmailOptions): Promise<void> {
    const html = this.loadTemplate(options.template, options.context);

    await this.transporter.sendMail({
      from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html,
    });
  }

  async sendTwoFactorCode(email: string, code: string, expiresInMinutes: number): Promise<void> {
    await this.send({
      to: email,
      subject: 'Your SpendWise Verification Code',
      template: 'two-factor-code',
      context: {
        code,
        expiresInMinutes,
      },
    });
  }

  async sendBackupCodes(email: string, codes: string[]): Promise<void> {
    await this.send({
      to: email,
      subject: 'Your SpendWise Backup Codes',
      template: 'backup-codes',
      context: {
        codes: codes.join('\n'),
      },
    });
  }

  async send2FAEnabledNotification(email: string, type: 'email' | 'sms'): Promise<void> {
    await this.send({
      to: email,
      subject: 'Two-Factor Authentication Enabled',
      template: '2fa-enabled',
      context: {
        method: type === 'email' ? 'Email' : 'SMS',
      },
    });
  }

  async send2FADisabledNotification(email: string, type: 'email' | 'sms'): Promise<void> {
    await this.send({
      to: email,
      subject: 'Two-Factor Authentication Disabled',
      template: '2fa-disabled',
      context: {
        method: type === 'email' ? 'Email' : 'SMS',
      },
    });
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
