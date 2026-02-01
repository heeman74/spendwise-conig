import { SMSService } from '../../lib/sms';
import twilio from 'twilio';

// Mock twilio
jest.mock('twilio');

describe('SMSService', () => {
  let smsService: SMSService;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    mockCreate = jest.fn().mockResolvedValue({
      sid: 'test-message-sid',
      status: 'sent',
    });

    (twilio as unknown as jest.Mock).mockReturnValue({
      messages: {
        create: mockCreate,
      },
    });

    // Set valid Twilio credentials
    process.env.TWILIO_ACCOUNT_SID = 'ACtest123456789';
    process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';
    process.env.TWILIO_PHONE_NUMBER = '+1234567890';

    smsService = new SMSService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendTwoFactorCode', () => {
    it('should send SMS with correct parameters', async () => {
      const phoneNumber = '+1987654321';
      const code = '123456';

      await smsService.sendTwoFactorCode(phoneNumber, code);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith({
        body: expect.stringContaining(code),
        from: '+1234567890',
        to: phoneNumber,
      });
    });

    it('should include verification code in message body', async () => {
      const phoneNumber = '+1987654321';
      const code = '654321';

      await smsService.sendTwoFactorCode(phoneNumber, code);

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.body).toContain('654321');
    });

    it('should include expiration warning in message', async () => {
      const phoneNumber = '+1987654321';
      const code = '123456';

      await smsService.sendTwoFactorCode(phoneNumber, code);

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.body).toMatch(/expire|valid/i);
    });

    it('should include SpendWise branding in message', async () => {
      const phoneNumber = '+1987654321';
      const code = '123456';

      await smsService.sendTwoFactorCode(phoneNumber, code);

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.body).toContain('SpendWise');
    });

    it('should format phone number in E.164 format', async () => {
      const phoneNumber = '+44123456789';
      const code = '123456';

      await smsService.sendTwoFactorCode(phoneNumber, code);

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.to).toBe('+44123456789');
    });

    it('should handle SMS sending errors', async () => {
      mockCreate.mockRejectedValue(new Error('Invalid phone number'));

      await expect(
        smsService.sendTwoFactorCode('+1234567890', '123456')
      ).rejects.toThrow('Invalid phone number');
    });

    it('should throw error if SMS service not configured', async () => {
      // Create service without valid credentials
      process.env.TWILIO_ACCOUNT_SID = '';
      const unconfiguredService = new SMSService();

      await expect(
        unconfiguredService.sendTwoFactorCode('+1234567890', '123456')
      ).rejects.toThrow('SMS service is not configured');
    });

    it('should throw error if account SID is invalid', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'INVALID_SID';
      const invalidService = new SMSService();

      await expect(
        invalidService.sendTwoFactorCode('+1234567890', '123456')
      ).rejects.toThrow('SMS service is not configured');
    });
  });

  describe('Configuration', () => {
    it('should initialize with valid credentials', () => {
      process.env.TWILIO_ACCOUNT_SID = 'ACvalid123';
      process.env.TWILIO_AUTH_TOKEN = 'token123';
      process.env.TWILIO_PHONE_NUMBER = '+1234567890';

      expect(() => new SMSService()).not.toThrow();
    });

    it('should handle missing account SID gracefully', () => {
      process.env.TWILIO_ACCOUNT_SID = '';
      expect(() => new SMSService()).not.toThrow();
    });

    it('should handle missing auth token gracefully', () => {
      process.env.TWILIO_ACCOUNT_SID = 'ACtest123';
      process.env.TWILIO_AUTH_TOKEN = '';
      expect(() => new SMSService()).not.toThrow();
    });

    it('should handle missing phone number gracefully', () => {
      process.env.TWILIO_ACCOUNT_SID = 'ACtest123';
      process.env.TWILIO_AUTH_TOKEN = 'token';
      process.env.TWILIO_PHONE_NUMBER = '';
      expect(() => new SMSService()).not.toThrow();
    });
  });

  describe('Error handling', () => {
    it('should handle Twilio API errors', async () => {
      mockCreate.mockRejectedValue({
        code: 21211,
        message: 'Invalid phone number',
      });

      await expect(
        smsService.sendTwoFactorCode('invalid', '123456')
      ).rejects.toThrow();
    });

    it('should handle network timeout errors', async () => {
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

    it('should handle insufficient balance errors', async () => {
      mockCreate.mockRejectedValue({
        code: 21614,
        message: 'Insufficient balance',
      });

      await expect(
        smsService.sendTwoFactorCode('+1234567890', '123456')
      ).rejects.toThrow();
    });
  });

  describe('International phone numbers', () => {
    it('should handle UK phone numbers', async () => {
      await smsService.sendTwoFactorCode('+441234567890', '123456');

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.to).toBe('+441234567890');
    });

    it('should handle Japanese phone numbers', async () => {
      await smsService.sendTwoFactorCode('+819012345678', '123456');

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.to).toBe('+819012345678');
    });

    it('should handle Australian phone numbers', async () => {
      await smsService.sendTwoFactorCode('+61412345678', '123456');

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.to).toBe('+61412345678');
    });
  });

  describe('Message content', () => {
    it('should keep message concise for SMS length limits', async () => {
      await smsService.sendTwoFactorCode('+1234567890', '123456');

      const callArgs = mockCreate.mock.calls[0][0];
      // SMS should be under 160 characters for single message
      expect(callArgs.body.length).toBeLessThan(160);
    });

    it('should not include HTML in message', async () => {
      await smsService.sendTwoFactorCode('+1234567890', '123456');

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.body).not.toContain('<');
      expect(callArgs.body).not.toContain('>');
    });
  });
});
