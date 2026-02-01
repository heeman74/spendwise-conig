import { SMSService } from '../../lib/sms';
import twilio from 'twilio';

// Mock twilio
jest.mock('twilio');

describe('SMSService', () => {
  let smsService: SMSService;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    mockCreate = jest.fn().mockResolvedValue({
      sid: 'SM-test-sid',
      status: 'sent',
    });

    (twilio as unknown as jest.Mock).mockReturnValue({
      messages: {
        create: mockCreate,
      },
    });

    smsService = new SMSService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendTwoFactorCode', () => {
    it('should send SMS with verification code', async () => {
      const phoneNumber = '+1234567890';
      const code = '123456';

      await smsService.sendTwoFactorCode(phoneNumber, code);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: phoneNumber,
          from: '+1234567890',
          body: expect.stringContaining(code),
        })
      );
    });

    it('should include code in message body', async () => {
      await smsService.sendTwoFactorCode('+1987654321', '654321');

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.body).toContain('654321');
    });

    it('should include SpendWise branding', async () => {
      await smsService.sendTwoFactorCode('+1234567890', '123456');

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.body).toContain('SpendWise');
    });

    it('should include expiration warning', async () => {
      await smsService.sendTwoFactorCode('+1234567890', '123456');

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.body).toMatch(/expire|valid/i);
    });

    it('should handle E.164 formatted numbers', async () => {
      const phoneNumber = '+44123456789';
      await smsService.sendTwoFactorCode(phoneNumber, '123456');

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.to).toBe(phoneNumber);
    });

    it('should keep message under 160 characters', async () => {
      await smsService.sendTwoFactorCode('+1234567890', '123456');

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.body.length).toBeLessThan(160);
    });

    it('should not include HTML in message', async () => {
      await smsService.sendTwoFactorCode('+1234567890', '123456');

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.body).not.toContain('<');
      expect(callArgs.body).not.toContain('>');
    });
  });

  describe('Error Handling', () => {
    it('should handle Twilio API errors', async () => {
      mockCreate.mockRejectedValue(new Error('Invalid phone number'));

      await expect(
        smsService.sendTwoFactorCode('+1234567890', '123456')
      ).rejects.toThrow('Invalid phone number');
    });

    it('should handle network timeout', async () => {
      mockCreate.mockRejectedValue(new Error('Request timeout'));

      await expect(
        smsService.sendTwoFactorCode('+1234567890', '123456')
      ).rejects.toThrow('Request timeout');
    });

    it('should handle rate limit errors', async () => {
      mockCreate.mockRejectedValue({
        code: 20003,
        message: 'Rate limit exceeded',
      });

      await expect(
        smsService.sendTwoFactorCode('+1234567890', '123456')
      ).rejects.toThrow();
    });
  });

  describe('International Phone Numbers', () => {
    it('should handle UK numbers', async () => {
      await smsService.sendTwoFactorCode('+441234567890', '123456');

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.to).toBe('+441234567890');
    });

    it('should handle Japanese numbers', async () => {
      await smsService.sendTwoFactorCode('+819012345678', '123456');

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.to).toBe('+819012345678');
    });

    it('should handle Australian numbers', async () => {
      await smsService.sendTwoFactorCode('+61412345678', '123456');

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.to).toBe('+61412345678');
    });
  });

  describe('Phone Number Validation', () => {
    it('should validate E.164 format', () => {
      expect(smsService.validatePhoneNumber('+1234567890')).toBe(true);
      expect(smsService.validatePhoneNumber('+441234567890')).toBe(true);
    });

    it('should validate US numbers without + prefix', () => {
      // formatPhoneNumber adds +1 for 10-digit US numbers
      expect(smsService.validatePhoneNumber('1234567890')).toBe(true);
      expect(smsService.validatePhoneNumber('4155551234')).toBe(true);
    });

    it('should reject clearly invalid formats', () => {
      expect(smsService.validatePhoneNumber('invalid')).toBe(false);
      expect(smsService.validatePhoneNumber('')).toBe(false);
    });

    it('should handle formatted US numbers', () => {
      // formatPhoneNumber removes non-numeric chars and adds +1
      expect(smsService.validatePhoneNumber('+14155551234')).toBe(true);
      expect(smsService.validatePhoneNumber('4155551234')).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should throw error when not configured', async () => {
      // Create unconfigured service
      process.env.TWILIO_ACCOUNT_SID = '';
      const unconfiguredService = new SMSService();

      await expect(
        unconfiguredService.sendTwoFactorCode('+1234567890', '123456')
      ).rejects.toThrow('SMS service is not configured');

      // Restore
      process.env.TWILIO_ACCOUNT_SID = 'ACtest123456789';
    });
  });
});
