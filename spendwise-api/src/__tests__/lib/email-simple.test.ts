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
    it('should send 2FA code email successfully', async () => {
      await emailService.sendTwoFactorCode('user@example.com', '123456', 1);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Verification'),
          html: expect.stringContaining('123456'),
        })
      );
    });

    it('should include expiration time in email', async () => {
      await emailService.sendTwoFactorCode('user@example.com', '654321', 1);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('1 minute');
    });

    it('should include SpendWise branding', async () => {
      await emailService.sendTwoFactorCode('user@example.com', '123456', 1);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('SpendWise');
    });

    it('should handle SMTP errors', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP connection failed'));

      await expect(
        emailService.sendTwoFactorCode('user@example.com', '123456', 1)
      ).rejects.toThrow('SMTP connection failed');
    });

    it('should send to correct email address', async () => {
      const testEmail = 'test@domain.com';
      await emailService.sendTwoFactorCode(testEmail, '999999', 1);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.to).toBe(testEmail);
    });
  });

  describe('sendBackupCodes', () => {
    it('should send backup codes email', async () => {
      const codes = ['CODE0001', 'CODE0002', 'CODE0003'];

      await emailService.sendBackupCodes('user@example.com', codes);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.subject).toContain('Backup Codes');
    });

    it('should include all backup codes in email', async () => {
      const codes = ['ABCD1234', 'EFGH5678', 'IJKL9012'];

      await emailService.sendBackupCodes('user@example.com', codes);

      const callArgs = mockSendMail.mock.calls[0][0];
      codes.forEach((code) => {
        expect(callArgs.html).toContain(code);
      });
    });

    it('should include security warning', async () => {
      await emailService.sendBackupCodes('user@example.com', ['CODE1']);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toMatch(/safe|secure|store/i);
    });

    it('should handle empty codes array', async () => {
      await emailService.sendBackupCodes('user@example.com', []);

      expect(mockSendMail).toHaveBeenCalled();
    });
  });

  describe('send2FAEnabledNotification', () => {
    it('should send email notification for email 2FA', async () => {
      await emailService.send2FAEnabledNotification('user@example.com', 'email');

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.subject).toContain('Two-Factor');
      expect(callArgs.html.toLowerCase()).toContain('email');
    });

    it('should send SMS notification for SMS 2FA', async () => {
      await emailService.send2FAEnabledNotification('user@example.com', 'sms');

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('SMS');
    });

    it('should include security information', async () => {
      await emailService.send2FAEnabledNotification('user@example.com', 'email');

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toMatch(/security|enabled|protection/i);
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeout', async () => {
      mockSendMail.mockRejectedValue(new Error('Network timeout'));

      await expect(
        emailService.sendTwoFactorCode('user@example.com', '123456', 1)
      ).rejects.toThrow('Network timeout');
    });

    it('should handle authentication errors', async () => {
      mockSendMail.mockRejectedValue(new Error('Invalid login: 535'));

      await expect(
        emailService.sendBackupCodes('user@example.com', ['CODE1'])
      ).rejects.toThrow('Invalid login');
    });

    it('should handle invalid recipient', async () => {
      mockSendMail.mockRejectedValue(new Error('Invalid recipient'));

      await expect(
        emailService.send2FAEnabledNotification('invalid-email', 'email')
      ).rejects.toThrow('Invalid recipient');
    });
  });

  describe('Email Templates', () => {
    it('should use HTML for all emails', async () => {
      await emailService.sendTwoFactorCode('user@example.com', '123456', 1);
      expect(mockSendMail.mock.calls[0][0].html).toContain('<');

      await emailService.sendBackupCodes('user@example.com', ['CODE1']);
      expect(mockSendMail.mock.calls[1][0].html).toContain('<');

      await emailService.send2FAEnabledNotification('user@example.com', 'email');
      expect(mockSendMail.mock.calls[2][0].html).toContain('<');
    });

    it('should have from field set', async () => {
      await emailService.sendTwoFactorCode('user@example.com', '123456', 1);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.from).toBeDefined();
    });
  });
});
