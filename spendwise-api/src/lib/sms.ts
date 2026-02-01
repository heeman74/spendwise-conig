import twilio from 'twilio';

export class SMSService {
  private client: twilio.Twilio | null = null;
  private fromNumber: string = '';
  private isConfigured: boolean = false;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    // Only initialize if valid credentials are provided
    if (accountSid && authToken && phoneNumber && accountSid.startsWith('AC')) {
      try {
        this.client = twilio(accountSid, authToken);
        this.fromNumber = phoneNumber;
        this.isConfigured = true;
        console.log('Twilio SMS service initialized successfully');
      } catch (error) {
        console.warn('Failed to initialize Twilio client:', error);
      }
    } else {
      console.warn('Twilio credentials not configured. SMS service will not be available.');
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');

    // Check if it starts with + (E.164 format already)
    if (phone.startsWith('+')) {
      return phone;
    }

    // If it starts with 1 and has 11 digits (US number with country code)
    //Todo: handle other country codes in the future
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return '+' + cleaned;
    }

    // If it has 10 digits, assume US and add +1
    // Todo: handle other country codes in the future 
    if (cleaned.length === 10) {
      return '+1' + cleaned;
    }

    // Otherwise return as-is with + prefix
    return '+' + cleaned;
  }

  async sendTwoFactorCode(phoneNumber: string, code: string): Promise<void> {
    if (!this.isConfigured || !this.client) {
      throw new Error('SMS service is not configured. Please set up Twilio credentials.');
    }

    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const message = `Your SpendWise verification code is: ${code}. This code will expire in 1 minute.`;

      await this.client.messages.create({
        body: message,
        to: formattedNumber,
        from: this.fromNumber,
      });

      console.log(`2FA code sent via SMS to ${formattedNumber}`);
    } catch (error: any) {
      console.error('Failed to send SMS:', error);
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  async send2FAEnabledNotification(phoneNumber: string): Promise<void> {
    if (!this.isConfigured || !this.client) {
      console.warn('SMS service not configured, skipping notification');
      return;
    }

    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const message = `Two-factor authentication via SMS has been enabled on your SpendWise account.`;

      await this.client.messages.create({
        body: message,
        to: formattedNumber,
        from: this.fromNumber,
      });

      console.log(`2FA enabled notification sent via SMS to ${formattedNumber}`);
    } catch (error: any) {
      console.error('Failed to send SMS notification:', error);
      // Don't throw here - notification failure shouldn't block the flow
    }
  }

  // Todo: Basic E.164 phone number validation with interational support
  validatePhoneNumber(phone: string): boolean {
    try {
      const formattedNumber = this.formatPhoneNumber(phone);
      // E.164 format validation: +[country code][number], max 15 digits total
      return /^\+[1-9]\d{1,14}$/.test(formattedNumber);
    } catch {
      return false;
    }
  }
}

export const smsService = new SMSService();
