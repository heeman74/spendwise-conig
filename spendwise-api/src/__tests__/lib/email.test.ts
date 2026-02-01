import { EmailService } from '../../lib/email';
import nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

describe('EmailService', () => {
  let emailService: EmailService;
  let mockSendMail: jest.Mock;

  beforeEach(() => {
    mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-message-id' });

    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    });

    emailService = new EmailService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendTwoFactorCode', () => {
    it('should send 2FA code email with correct parameters', async () => {
      const email = 'user@example.com';
      const code = '123456';
      const expiresInMinutes = 1;

      await emailService.sendTwoFactorCode(email, code, expiresInMinutes);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: expect.any(String),
        to: email,
        subject: 'Your SpendWise Verification Code',
        html: expect.stringContaining(code),
      });
    });

    it('should include expiration time in email', async () => {
      const email = 'user@example.com';
      const code = '123456';
      const expiresInMinutes = 1;

      await emailService.sendTwoFactorCode(email, code, expiresInMinutes);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('1 minute');
    });

    it('should include verification code in email body', async () => {
      const email = 'user@example.com';
      const code = '654321';

      await emailService.sendTwoFactorCode(email, code, 1);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('654321');
    });

    it('should handle email sending errors', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP connection failed'));

      await expect(
        emailService.sendTwoFactorCode('user@example.com', '123456', 1)
      ).rejects.toThrow('SMTP connection failed');
    });

    it('should format from address correctly', async () => {
      process.env.SMTP_FROM_NAME = 'SpendWise';
      process.env.SMTP_FROM_EMAIL = 'noreply@spendwise.com';

      await emailService.sendTwoFactorCode('user@example.com', '123456', 1);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.from).toContain('SpendWise');
      expect(callArgs.from).toContain('noreply@spendwise.com');
    });
  });

  describe('sendBackupCodes', () => {
    it('should send backup codes email', async () => {
      const email = 'user@example.com';
      const codes = ['ABCD1234', 'EFGH5678', 'IJKL9012'];

      await emailService.sendBackupCodes(email, codes);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: expect.any(String),
        to: email,
        subject: 'Your SpendWise Backup Codes',
        html: expect.any(String),
      });
    });

    it('should include all backup codes in email', async () => {
      const email = 'user@example.com';
      const codes = ['CODE0001', 'CODE0002', 'CODE0003'];

      await emailService.sendBackupCodes(email, codes);

      const callArgs = mockSendMail.mock.calls[0][0];
      codes.forEach((code) => {
        expect(callArgs.html).toContain(code);
      });
    });

    it('should include security warning in backup codes email', async () => {
      const email = 'user@example.com';
      const codes = ['ABCD1234'];

      await emailService.sendBackupCodes(email, codes);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toMatch(/safe|secure|store/i);
    });
  });

  describe('send2FAEnabledNotification', () => {
    it('should send email 2FA enabled notification', async () => {
      const email = 'user@example.com';

      await emailService.send2FAEnabledNotification(email, 'email');

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.from).toBeDefined();
      expect(callArgs.to).toBe(email);
      expect(callArgs.subject).toContain('Two-Factor Authentication');
      expect(callArgs.html.toLowerCase()).toContain('email');
    });

    it('should send SMS 2FA enabled notification', async () => {
      const email = 'user@example.com';

      await emailService.send2FAEnabledNotification(email, 'sms');

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('SMS');
    });

    it('should include security information in notification', async () => {
      const email = 'user@example.com';

      await emailService.send2FAEnabledNotification(email, 'email');

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toMatch(/security|protection|enabled/i);
    });
  });

  describe('Email templates', () => {
    it('should use HTML templates for all emails', async () => {
      await emailService.sendTwoFactorCode('user@example.com', '123456', 1);
      expect(mockSendMail.mock.calls[0][0].html).toContain('<');

      await emailService.sendBackupCodes('user@example.com', ['CODE1']);
      expect(mockSendMail.mock.calls[1][0].html).toContain('<');

      await emailService.send2FAEnabledNotification('user@example.com', 'email');
      expect(mockSendMail.mock.calls[2][0].html).toContain('<');
    });

    it('should include SpendWise branding', async () => {
      await emailService.sendTwoFactorCode('user@example.com', '123456', 1);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('SpendWise');
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      mockSendMail.mockRejectedValue(new Error('Network timeout'));

      await expect(
        emailService.sendTwoFactorCode('user@example.com', '123456', 1)
      ).rejects.toThrow('Network timeout');
    });

    it('should handle authentication errors', async () => {
      mockSendMail.mockRejectedValue(new Error('Invalid login'));

      await expect(
        emailService.sendBackupCodes('user@example.com', ['CODE1'])
      ).rejects.toThrow('Invalid login');
    });

    it('should handle invalid email addresses gracefully', async () => {
      mockSendMail.mockRejectedValue(new Error('Invalid recipient'));

      await expect(
        emailService.send2FAEnabledNotification('invalid-email', 'email')
      ).rejects.toThrow('Invalid recipient');
    });
  });
});
