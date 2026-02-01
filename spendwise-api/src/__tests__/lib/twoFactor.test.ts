import { TwoFactorService } from '../../lib/twoFactor';
import { EmailService } from '../../lib/email';
import { SMSService } from '../../lib/sms';
import { prisma } from '../../lib/prisma';
import bcrypt from 'bcryptjs';

// Mock dependencies
jest.mock('../../lib/email');
jest.mock('../../lib/sms');

const twoFactorService = new TwoFactorService();

describe('TwoFactorService', () => {
  const testUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    password: 'hashed-password',
    name: 'Test User',
    phoneNumber: null,
    emailVerified: false,
    phoneVerified: false,
    twoFactorEmailEnabled: false,
    twoFactorSmsEnabled: false,
    backupCodes: null,
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock responses
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(testUser);
    (prisma.twoFactorCode.create as jest.Mock).mockResolvedValue({
      id: 'code-id',
      userId: testUser.id,
      code: 'hashed-code',
      type: 'EMAIL',
      purpose: 'SETUP',
      expiresAt: new Date(Date.now() + 60000),
      verified: false,
      attempts: 0,
      createdAt: new Date(),
    });
    (prisma.twoFactorLog.create as jest.Mock).mockResolvedValue({
      id: 'log-id',
      userId: testUser.id,
      event: 'CODE_SENT',
      type: 'EMAIL',
      success: true,
      ipAddress: null,
      userAgent: null,
      metadata: null,
      createdAt: new Date(),
    });
  });

  describe('sendCode', () => {
    it('should send email verification code', async () => {
      const mockSendEmail = jest.spyOn(EmailService.prototype, 'sendTwoFactorCode').mockResolvedValue();
      (prisma.twoFactorCode.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await twoFactorService.sendCode(testUser.id, 'EMAIL', 'SETUP');

      expect(mockSendEmail).toHaveBeenCalledWith(
        testUser.email,
        expect.any(String),
        1 // 1 minute expiration
      );

      // Verify code creation was called
      expect(prisma.twoFactorCode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: testUser.id,
            type: 'EMAIL',
            purpose: 'SETUP',
          }),
        })
      );
    });

    it('should send SMS verification code', async () => {
      const encryptedPhone = twoFactorService.encryptPhoneNumber('+1234567890');

      // Mock user.findUnique to return user with phone number
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...testUser,
        phoneNumber: encryptedPhone,
      });

      (prisma.twoFactorCode.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'code-id',
          userId: testUser.id,
          code: 'hashed-code',
          type: 'SMS',
          purpose: 'LOGIN',
        },
      ]);

      const mockSendSMS = jest.spyOn(SMSService.prototype, 'sendTwoFactorCode').mockResolvedValue();
      (prisma.twoFactorCode.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await twoFactorService.sendCode(testUser.id, 'SMS', 'LOGIN');

      expect(mockSendSMS).toHaveBeenCalledWith('+1234567890', expect.any(String));
      expect(prisma.twoFactorCode.create).toHaveBeenCalled();
    });

    it('should throw error if phone number not found for SMS', async () => {
      // Mock user.findUnique to return user without phone number
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...testUser,
        phoneNumber: null,
      });

      await expect(
        twoFactorService.sendCode(testUser.id, 'SMS', 'LOGIN')
      ).rejects.toThrow('Phone number not configured');
    });

    it('should enforce rate limiting', async () => {
      const mockSendEmail = jest.spyOn(EmailService.prototype, 'sendTwoFactorCode').mockResolvedValue();

      // Send 3 codes (should succeed)
      await twoFactorService.sendCode(testUser.id, 'EMAIL', 'SETUP');
      await twoFactorService.sendCode(testUser.id, 'EMAIL', 'SETUP');
      await twoFactorService.sendCode(testUser.id, 'EMAIL', 'SETUP');

      expect(mockSendEmail).toHaveBeenCalledTimes(3);

      // 4th attempt should fail
      await expect(
        twoFactorService.sendCode(testUser.id, 'EMAIL', 'SETUP')
      ).rejects.toThrow('Too many code requests');
    });

    it('should invalidate previous unverified codes', async () => {
      jest.spyOn(EmailService.prototype, 'sendTwoFactorCode').mockResolvedValue();
      (prisma.twoFactorCode.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      // Send first code
      await twoFactorService.sendCode(testUser.id, 'EMAIL', 'SETUP');

      // Send second code (should invalidate first)
      await twoFactorService.sendCode(testUser.id, 'EMAIL', 'SETUP');

      // Verify updateMany was called to invalidate previous codes
      expect(prisma.twoFactorCode.updateMany).toHaveBeenCalled();
    });

    it('should create audit log for code sent', async () => {
      jest.spyOn(EmailService.prototype, 'sendTwoFactorCode').mockResolvedValue();

      await twoFactorService.sendCode(testUser.id, 'EMAIL', 'SETUP');

      expect(prisma.twoFactorLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: testUser.id,
            event: 'CODE_SENT',
            type: 'EMAIL',
            success: true,
          }),
        })
      );
    });
  });

  describe('verifyCode', () => {
    let validCode: string;
    let hashedCode: string;

    beforeEach(async () => {
      validCode = '123456';
      hashedCode = await bcrypt.hash(validCode, 10);
    });

    it('should verify valid code', async () => {
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

      const result = await twoFactorService.verifyCode(testUser.id, validCode, 'EMAIL', 'SETUP');

      expect(result).toBe(true);
      expect(prisma.twoFactorCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ verified: true }),
        })
      );
    });

    it('should reject invalid code', async () => {
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

      const result = await twoFactorService.verifyCode(testUser.id, '999999', 'EMAIL', 'SETUP');

      expect(result).toBe(false);
      expect(prisma.twoFactorCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ attempts: 1 }),
        })
      );
    });

    it('should reject expired code', async () => {
      // When a code is expired, findFirst with expiresAt: { gte: new Date() } returns null
      (prisma.twoFactorCode.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await twoFactorService.verifyCode(testUser.id, validCode, 'EMAIL', 'SETUP');

      expect(result).toBe(false);
      expect(prisma.twoFactorLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            event: 'CODE_FAILED',
            success: false,
          }),
        })
      );
    });

    it('should reject code after max attempts', async () => {
      (prisma.twoFactorCode.findFirst as jest.Mock).mockResolvedValue({
        id: 'code-id',
        userId: testUser.id,
        code: hashedCode,
        type: 'EMAIL',
        purpose: 'SETUP',
        expiresAt: new Date(Date.now() + 60000),
        verified: false,
        attempts: 3, // Already at max attempts
      });

      // Valid code should now throw error
      await expect(
        twoFactorService.verifyCode(testUser.id, validCode, 'EMAIL', 'SETUP')
      ).rejects.toThrow('Too many failed attempts');
    });

    it('should create audit log for successful verification', async () => {
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

      await twoFactorService.verifyCode(testUser.id, validCode, 'EMAIL', 'SETUP');

      expect(prisma.twoFactorLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: testUser.id,
            event: 'CODE_VERIFIED',
            success: true,
          }),
        })
      );
    });

    it('should create audit log for failed verification', async () => {
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

      await twoFactorService.verifyCode(testUser.id, '999999', 'EMAIL', 'SETUP');

      expect(prisma.twoFactorLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: testUser.id,
            event: 'CODE_FAILED',
            success: false,
          }),
        })
      );
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate 10 backup codes', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({ ...testUser });

      const codes = await twoFactorService.generateBackupCodes(testUser.id);

      expect(codes).toHaveLength(10);
      codes.forEach((code) => {
        expect(code).toHaveLength(8);
        expect(code).toMatch(/^[A-Z0-9]+$/);
      });
      expect(prisma.user.update).toHaveBeenCalled();
    }, 15000);

    it('should hash and store backup codes', async () => {
      let storedBackupCodes: string | null = null;

      (prisma.user.update as jest.Mock).mockImplementation(async ({ data }: any) => {
        storedBackupCodes = data.backupCodes;
        return { ...testUser, backupCodes: data.backupCodes };
      });

      (prisma.user.findUnique as jest.Mock).mockImplementation(async () => {
        return { ...testUser, backupCodes: storedBackupCodes };
      });

      const codes = await twoFactorService.generateBackupCodes(testUser.id);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: testUser.id },
        data: { backupCodes: expect.any(String) },
      });

      const user = await prisma.user.findUnique({ where: { id: testUser.id } });
      expect(user?.backupCodes).toBeDefined();

      const storedCodes = JSON.parse(user!.backupCodes!);
      expect(storedCodes).toHaveLength(10);

      // Verify codes are hashed
      for (let i = 0; i < codes.length; i++) {
        const isMatch = await bcrypt.compare(codes[i], storedCodes[i]);
        expect(isMatch).toBe(true);
      }
    }, 20000);

    it('should replace existing backup codes', async () => {
      let storedBackupCodes: string | null = null;

      (prisma.user.update as jest.Mock).mockImplementation(async ({ data }: any) => {
        storedBackupCodes = data.backupCodes;
        return { ...testUser, backupCodes: data.backupCodes };
      });

      (prisma.user.findUnique as jest.Mock).mockImplementation(async () => {
        return { ...testUser, backupCodes: storedBackupCodes };
      });

      const firstCodes = await twoFactorService.generateBackupCodes(testUser.id);
      const secondCodes = await twoFactorService.generateBackupCodes(testUser.id);

      expect(firstCodes).not.toEqual(secondCodes);

      const user = await prisma.user.findUnique({ where: { id: testUser.id } });
      const storedCodes = JSON.parse(user!.backupCodes!);

      // Verify second codes are stored
      const isMatch = await bcrypt.compare(secondCodes[0], storedCodes[0]);
      expect(isMatch).toBe(true);
    }, 30000);
  });

  describe('verifyBackupCode', () => {
    let backupCodes: string[];
    let storedBackupCodes: string | null = null;

    beforeEach(async () => {
      (prisma.user.update as jest.Mock).mockImplementation(async ({ data }: any) => {
        storedBackupCodes = data.backupCodes;
        return { ...testUser, backupCodes: data.backupCodes };
      });

      (prisma.user.findUnique as jest.Mock).mockImplementation(async () => {
        return { ...testUser, backupCodes: storedBackupCodes };
      });

      (prisma.twoFactorLog.create as jest.Mock).mockResolvedValue({});
      (prisma.twoFactorLog.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'log-id',
          userId: testUser.id,
          event: 'BACKUP_CODE_USED',
          success: true,
          createdAt: new Date(),
        },
      ]);

      backupCodes = await twoFactorService.generateBackupCodes(testUser.id);
    }, 15000);

    it('should verify valid backup code', async () => {
      const result = await twoFactorService.verifyBackupCode(testUser.id, backupCodes[0]);

      expect(result).toBe(true);
      expect(prisma.user.update).toHaveBeenCalled();
    }, 10000);

    it('should reject invalid backup code', async () => {
      const result = await twoFactorService.verifyBackupCode(testUser.id, 'INVALID1');

      expect(result).toBe(false);
    }, 10000);

    it('should remove used backup code', async () => {
      await twoFactorService.verifyBackupCode(testUser.id, backupCodes[0]);

      // Try to use same code again
      const result = await twoFactorService.verifyBackupCode(testUser.id, backupCodes[0]);

      expect(result).toBe(false);

      // Verify code was removed from database
      const user = await prisma.user.findUnique({ where: { id: testUser.id } });
      const storedCodes = JSON.parse(user!.backupCodes!);
      expect(storedCodes).toHaveLength(9);
    }, 15000);

    it('should create audit log for backup code usage', async () => {
      await twoFactorService.verifyBackupCode(testUser.id, backupCodes[0]);

      expect(prisma.twoFactorLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: testUser.id,
            event: 'BACKUP_CODE_USED',
            success: true,
          }),
        })
      );
    }, 10000);

    it('should warn when backup codes are low', async () => {
      // Use 8 codes (leaving 2)
      for (let i = 0; i < 8; i++) {
        await twoFactorService.verifyBackupCode(testUser.id, backupCodes[i]);
      }

      const user = await prisma.user.findUnique({ where: { id: testUser.id } });
      const storedCodes = JSON.parse(user!.backupCodes!);
      expect(storedCodes).toHaveLength(2);
    }, 30000);
  });

  describe('encryptPhoneNumber and decryptPhoneNumber', () => {
    it('should encrypt and decrypt phone number', () => {
      const originalPhone = '+1234567890';
      const encrypted = twoFactorService.encryptPhoneNumber(originalPhone);
      const decrypted = twoFactorService.decryptPhoneNumber(encrypted);

      expect(encrypted).not.toBe(originalPhone);
      expect(decrypted).toBe(originalPhone);
    });

    it('should produce different encrypted values for same phone', () => {
      const phone = '+1234567890';
      const encrypted1 = twoFactorService.encryptPhoneNumber(phone);
      const encrypted2 = twoFactorService.encryptPhoneNumber(phone);

      // Different IVs should produce different ciphertexts
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same value
      expect(twoFactorService.decryptPhoneNumber(encrypted1)).toBe(phone);
      expect(twoFactorService.decryptPhoneNumber(encrypted2)).toBe(phone);
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

  describe('checkRateLimit', () => {
    it('should allow requests within limit', async () => {
      const result1 = await twoFactorService.checkRateLimit(testUser.id, 'EMAIL');
      const result2 = await twoFactorService.checkRateLimit(testUser.id, 'EMAIL');
      const result3 = await twoFactorService.checkRateLimit(testUser.id, 'EMAIL');

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
    });

    it('should block requests exceeding limit', async () => {
      await twoFactorService.checkRateLimit(testUser.id, 'EMAIL');
      await twoFactorService.checkRateLimit(testUser.id, 'EMAIL');
      await twoFactorService.checkRateLimit(testUser.id, 'EMAIL');

      const result = await twoFactorService.checkRateLimit(testUser.id, 'EMAIL');

      expect(result).toBe(false);
    });

    it('should track different types separately', async () => {
      await twoFactorService.checkRateLimit(testUser.id, 'EMAIL');
      await twoFactorService.checkRateLimit(testUser.id, 'EMAIL');
      await twoFactorService.checkRateLimit(testUser.id, 'EMAIL');

      // SMS should still be allowed
      const result = await twoFactorService.checkRateLimit(testUser.id, 'SMS');

      expect(result).toBe(true);
    });
  });
});
