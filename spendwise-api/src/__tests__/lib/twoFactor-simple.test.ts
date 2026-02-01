import { TwoFactorService } from '../../lib/twoFactor';
import { EmailService } from '../../lib/email';
import { SMSService } from '../../lib/sms';
import { prisma } from '../../lib/prisma';
import bcrypt from 'bcryptjs';

// Mock dependencies
jest.mock('../../lib/email');
jest.mock('../../lib/sms');

const twoFactorService = new TwoFactorService();

describe('TwoFactorService - Basic Tests', () => {
  const testUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    password: 'hashed-password',
    name: 'Test User',
    phoneNumber: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(testUser);
  });

  describe('sendCode', () => {
    it('should send email verification code', async () => {
      const mockSendEmail = jest.spyOn(EmailService.prototype, 'sendTwoFactorCode').mockResolvedValue();
      (prisma.twoFactorCode.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.twoFactorCode.create as jest.Mock).mockResolvedValue({
        id: 'code-id',
        userId: testUser.id,
        code: 'hashed-code',
        type: 'EMAIL',
      });
      (prisma.twoFactorLog.create as jest.Mock).mockResolvedValue({});

      await twoFactorService.sendCode(testUser.id, 'EMAIL', 'SETUP');

      expect(mockSendEmail).toHaveBeenCalledWith(
        testUser.email,
        expect.any(String),
        1
      );
      expect(prisma.twoFactorCode.create).toHaveBeenCalled();
      expect(prisma.twoFactorLog.create).toHaveBeenCalled();
    });

    it('should send SMS verification code', async () => {
      const encryptedPhone = twoFactorService.encryptPhoneNumber('+1234567890');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...testUser,
        phoneNumber: encryptedPhone,
      });

      const mockSendSMS = jest.spyOn(SMSService.prototype, 'sendTwoFactorCode').mockResolvedValue();
      (prisma.twoFactorCode.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.twoFactorCode.create as jest.Mock).mockResolvedValue({});
      (prisma.twoFactorLog.create as jest.Mock).mockResolvedValue({});

      await twoFactorService.sendCode(testUser.id, 'SMS', 'LOGIN');

      expect(mockSendSMS).toHaveBeenCalledWith('+1234567890', expect.any(String));
    });

    it('should throw error if phone number not found for SMS', async () => {
      await expect(
        twoFactorService.sendCode(testUser.id, 'SMS', 'LOGIN')
      ).rejects.toThrow('Phone number not configured');
    });
  });

  describe('verifyCode', () => {
    it('should verify valid code', async () => {
      const validCode = '123456';
      const hashedCode = await bcrypt.hash(validCode, 10);

      (prisma.twoFactorCode.findFirst as jest.Mock).mockResolvedValue({
        id: 'code-id',
        userId: testUser.id,
        code: hashedCode,
        type: 'EMAIL',
        purpose: 'SETUP',
        expiresAt: new Date(Date.now() + 60000),
        verified: false,
        attempts: 0,
      });
      (prisma.twoFactorCode.update as jest.Mock).mockResolvedValue({});
      (prisma.twoFactorLog.create as jest.Mock).mockResolvedValue({});

      const result = await twoFactorService.verifyCode(testUser.id, validCode, 'EMAIL', 'SETUP');

      expect(result).toBe(true);
      expect(prisma.twoFactorCode.update).toHaveBeenCalled();
    });

    it('should reject invalid code', async () => {
      const hashedCode = await bcrypt.hash('123456', 10);

      (prisma.twoFactorCode.findFirst as jest.Mock).mockResolvedValue({
        id: 'code-id',
        code: hashedCode,
        expiresAt: new Date(Date.now() + 60000),
        attempts: 0,
      });
      (prisma.twoFactorCode.update as jest.Mock).mockResolvedValue({});
      (prisma.twoFactorLog.create as jest.Mock).mockResolvedValue({});

      const result = await twoFactorService.verifyCode(testUser.id, '999999', 'EMAIL', 'SETUP');

      expect(result).toBe(false);
    });

    it('should reject expired code', async () => {
      (prisma.twoFactorCode.findFirst as jest.Mock).mockResolvedValue({
        id: 'code-id',
        code: 'hashed-code',
        expiresAt: new Date(Date.now() - 1000),
        attempts: 0,
      });

      const result = await twoFactorService.verifyCode(testUser.id, '123456', 'EMAIL', 'SETUP');

      expect(result).toBe(false);
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate 10 backup codes', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const codes = await twoFactorService.generateBackupCodes(testUser.id);

      expect(codes).toHaveLength(10);
      codes.forEach((code) => {
        expect(code).toHaveLength(8);
        expect(code).toMatch(/^[A-Z0-9]+$/);
      });
      expect(prisma.user.update).toHaveBeenCalled();
    });
  });

  describe('verifyBackupCode', () => {
    it('should verify valid backup code', async () => {
      const validCode = 'BACKUP01';
      const hashedCode = await bcrypt.hash(validCode, 10);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...testUser,
        backupCodes: JSON.stringify([hashedCode, 'other-code']),
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (prisma.twoFactorLog.create as jest.Mock).mockResolvedValue({});

      const result = await twoFactorService.verifyBackupCode(testUser.id, validCode);

      expect(result).toBe(true);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should reject invalid backup code', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...testUser,
        backupCodes: JSON.stringify(['hashed-code-1', 'hashed-code-2']),
      });
      (prisma.twoFactorLog.create as jest.Mock).mockResolvedValue({});

      const result = await twoFactorService.verifyBackupCode(testUser.id, 'INVALID1');

      expect(result).toBe(false);
    });
  });

  describe('encryptPhoneNumber and decryptPhoneNumber', () => {
    it('should encrypt and decrypt phone number', () => {
      const originalPhone = '+1234567890';
      const encrypted = twoFactorService.encryptPhoneNumber(originalPhone);
      const decrypted = twoFactorService.decryptPhoneNumber(encrypted);

      expect(encrypted).not.toBe(originalPhone);
      expect(decrypted).toBe(originalPhone);
    });

    it('should handle international phone numbers', () => {
      const phones = ['+44123456789', '+81901234567', '+61412345678'];

      phones.forEach((phone) => {
        const encrypted = twoFactorService.encryptPhoneNumber(phone);
        const decrypted = twoFactorService.decryptPhoneNumber(encrypted);
        expect(decrypted).toBe(phone);
      });
    });
  });
});
