import { PrismaClient } from '@prisma/client';
import { fieldEncryptionExtension } from 'prisma-field-encryption';
import { twoFactorResolvers } from '../../schema/resolvers/twoFactor';
import { twoFactorService, TwoFactorService } from '../../lib/twoFactor';
import { emailService, EmailService } from '../../lib/email';
import { smsService, SMSService } from '../../lib/sms';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis-mock';
import { prisma as globalPrisma } from '../../lib/prisma';

const prisma = new PrismaClient().$extends(fieldEncryptionExtension());
const redis = new Redis();

describe('TwoFactor Resolvers', () => {
  let testUser: any;
  let context: any;

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        email: 'resolver-test@example.com',
        password: await bcrypt.hash('password123', 10),
        name: 'Resolver Test User',
      },
    });

    context = {
      prisma,
      redis,
      user: testUser,
    };
  });

  afterAll(async () => {
    await prisma.twoFactorCode.deleteMany({ where: { userId: testUser.id } });
    await prisma.twoFactorLog.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.twoFactorCode.deleteMany({ where: { userId: testUser.id } });
    await prisma.twoFactorLog.deleteMany({ where: { userId: testUser.id } });
    jest.clearAllMocks();

    // Make the global mocked prisma pass through to the real database
    (globalPrisma.user.findUnique as jest.Mock).mockImplementation(async (args: any) => {
      return await prisma.user.findUnique(args);
    });
    (globalPrisma.user.update as jest.Mock).mockImplementation(async (args: any) => {
      return await prisma.user.update(args);
    });
    (globalPrisma.twoFactorLog.create as jest.Mock).mockImplementation(async (args: any) => {
      return await prisma.twoFactorLog.create(args);
    });
    (globalPrisma.twoFactorLog.findMany as jest.Mock).mockImplementation(async (args: any) => {
      return await prisma.twoFactorLog.findMany(args);
    });
  });

  describe('Query: twoFactorStatus', () => {
    it('should return current 2FA status', async () => {
      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          twoFactorEmailEnabled: true,
          emailVerified: true,
          twoFactorSmsEnabled: false,
          backupCodes: JSON.stringify(['CODE1', 'CODE2', 'CODE3']),
        },
      });

      const result = await twoFactorResolvers.Query.twoFactorStatus(null, {}, context);

      expect(result).toEqual({
        emailEnabled: true,
        smsEnabled: false,
        emailVerified: true,
        phoneVerified: false,
        phoneNumber: null,
        backupCodesRemaining: 3,
      });
    });

    it('should require authentication', async () => {
      const unauthContext = { prisma, redis, user: null };

      await expect(
        twoFactorResolvers.Query.twoFactorStatus(null, {}, unauthContext)
      ).rejects.toThrow('You must be logged in');
    });

    it('should decrypt phone number if present', async () => {
      const encryptedPhone = twoFactorService.encryptPhoneNumber('+1234567890');

      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          phoneNumber: encryptedPhone,
          phoneVerified: true,
        },
      });

      const result = await twoFactorResolvers.Query.twoFactorStatus(null, {}, context);

      // Phone number should be masked for security
      expect(result.phoneNumber).toContain('***');
      expect(result.phoneNumber).toContain('7890'); // Last 4 digits visible
    });

    it('should return 0 for backup codes if none exist', async () => {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { backupCodes: null },
      });

      const result = await twoFactorResolvers.Query.twoFactorStatus(null, {}, context);

      expect(result.backupCodesRemaining).toBe(0);
    });
  });

  describe('Mutation: sendSetupCode', () => {
    it('should send email setup code', async () => {
      const mockSendCode = jest.spyOn(TwoFactorService.prototype, 'sendCode').mockResolvedValue();

      const result = await twoFactorResolvers.Mutation.sendSetupCode(
        null,
        { type: 'EMAIL' },
        context
      );

      expect(mockSendCode).toHaveBeenCalledWith(testUser.id, 'EMAIL', 'SETUP');
      expect(result.success).toBe(true);
      expect(result.expiresInMinutes).toBe(1);
      // Email should be masked for security
      expect(result.codeSentTo).toContain('***');
      expect(result.codeSentTo).toContain('@example.com');
    });

    it('should send SMS setup code with phone number', async () => {
      const mockSendCode = jest.spyOn(TwoFactorService.prototype, 'sendCode').mockResolvedValue();

      const result = await twoFactorResolvers.Mutation.sendSetupCode(
        null,
        { type: 'SMS', phoneNumber: '+1234567890' },
        context
      );

      expect(mockSendCode).toHaveBeenCalledWith(testUser.id, 'SMS', 'SETUP');
      expect(result.success).toBe(true);
      expect(result.codeSentTo).toContain('***');
    });

    it('should mask phone number in response', async () => {
      jest.spyOn(TwoFactorService.prototype, 'sendCode').mockResolvedValue();

      const result = await twoFactorResolvers.Mutation.sendSetupCode(
        null,
        { type: 'SMS', phoneNumber: '+1234567890' },
        context
      );

      expect(result.codeSentTo).not.toBe('+1234567890');
      expect(result.codeSentTo).toMatch(/\*\*\*/);
    });

    it('should require authentication', async () => {
      const unauthContext = { prisma, redis, user: null };

      await expect(
        twoFactorResolvers.Mutation.sendSetupCode(null, { type: 'EMAIL' }, unauthContext)
      ).rejects.toThrow('You must be logged in');
    });

    it('should handle service errors', async () => {
      const spy = jest.spyOn(TwoFactorService.prototype, 'sendCode').mockRejectedValue(
        new Error('Too many requests')
      );

      await expect(
        twoFactorResolvers.Mutation.sendSetupCode(null, { type: 'EMAIL' }, context)
      ).rejects.toThrow('Too many requests');

      spy.mockRestore();
    });
  });

  describe('Mutation: enableTwoFactor', () => {
    it('should enable email 2FA with valid code', async () => {
      jest.spyOn(TwoFactorService.prototype, 'verifyCode').mockResolvedValue(true);
      const mockGenerateBackupCodes = jest
        .spyOn(TwoFactorService.prototype, 'generateBackupCodes')
        .mockResolvedValue(['CODE1', 'CODE2']);
      jest.spyOn(EmailService.prototype, 'send2FAEnabledNotification').mockResolvedValue();

      const result = await twoFactorResolvers.Mutation.enableTwoFactor(
        null,
        { type: 'EMAIL', code: '123456' },
        context
      );

      expect(result.success).toBe(true);
      expect(result.backupCodes).toEqual(['CODE1', 'CODE2']);

      const user = await prisma.user.findUnique({ where: { id: testUser.id } });
      expect(user?.twoFactorEmailEnabled).toBe(true);
      expect(user?.emailVerified).toBe(true);
    });

    it('should enable SMS 2FA and verify phone', async () => {
      jest.spyOn(TwoFactorService.prototype, 'verifyCode').mockResolvedValue(true);
      jest.spyOn(TwoFactorService.prototype, 'generateBackupCodes').mockResolvedValue([]);
      jest.spyOn(EmailService.prototype, 'send2FAEnabledNotification').mockResolvedValue();
      jest.spyOn(SMSService.prototype, 'send2FAEnabledNotification').mockResolvedValue();

      await twoFactorResolvers.Mutation.enableTwoFactor(
        null,
        { type: 'SMS', code: '123456' },
        context
      );

      const user = await prisma.user.findUnique({ where: { id: testUser.id } });
      expect(user?.twoFactorSmsEnabled).toBe(true);
      expect(user?.phoneVerified).toBe(true);
    });

    it('should reject invalid code', async () => {
      jest.spyOn(TwoFactorService.prototype, 'verifyCode').mockResolvedValue(false);

      await expect(
        twoFactorResolvers.Mutation.enableTwoFactor(
          null,
          { type: 'EMAIL', code: '999999' },
          context
        )
      ).rejects.toThrow('Invalid or expired verification code');
    });

    it('should create audit log on success', async () => {
      jest.spyOn(TwoFactorService.prototype, 'verifyCode').mockResolvedValue(true);
      jest.spyOn(TwoFactorService.prototype, 'generateBackupCodes').mockResolvedValue([]);
      jest.spyOn(EmailService.prototype, 'send2FAEnabledNotification').mockResolvedValue();

      await twoFactorResolvers.Mutation.enableTwoFactor(
        null,
        { type: 'EMAIL', code: '123456' },
        context
      );

      const logs = await prisma.twoFactorLog.findMany({
        where: { userId: testUser.id, event: 'SETUP_COMPLETED' },
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].success).toBe(true);
    });
  });

  describe('Mutation: disableTwoFactor', () => {
    beforeEach(async () => {
      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          twoFactorEmailEnabled: true,
          emailVerified: true,
        },
      });
    });

    it('should disable 2FA with valid code', async () => {
      jest.spyOn(TwoFactorService.prototype, 'sendCode').mockResolvedValue();
      jest.spyOn(TwoFactorService.prototype, 'verifyCode').mockResolvedValue(true);
      jest.spyOn(EmailService.prototype, 'send2FADisabledNotification').mockResolvedValue();

      const result = await twoFactorResolvers.Mutation.disableTwoFactor(
        null,
        { type: 'EMAIL', code: '123456' },
        context
      );

      expect(result).toBe(true);

      const user = await prisma.user.findUnique({ where: { id: testUser.id } });
      expect(user?.twoFactorEmailEnabled).toBe(false);
    });

    it('should reject invalid code', async () => {
      jest.spyOn(TwoFactorService.prototype, 'sendCode').mockResolvedValue();
      jest.spyOn(TwoFactorService.prototype, 'verifyCode').mockResolvedValue(false);

      await expect(
        twoFactorResolvers.Mutation.disableTwoFactor(
          null,
          { type: 'EMAIL', code: '999999' },
          context
        )
      ).rejects.toThrow('Invalid verification code');
    });

    it('should create audit log', async () => {
      jest.spyOn(TwoFactorService.prototype, 'sendCode').mockResolvedValue();
      jest.spyOn(TwoFactorService.prototype, 'verifyCode').mockResolvedValue(true);
      jest.spyOn(EmailService.prototype, 'send2FADisabledNotification').mockResolvedValue();

      await twoFactorResolvers.Mutation.disableTwoFactor(
        null,
        { type: 'EMAIL', code: '123456' },
        context
      );

      const logs = await prisma.twoFactorLog.findMany({
        where: { userId: testUser.id, event: 'DISABLED' },
      });

      expect(logs).toHaveLength(1);
    });
  });

  describe('Mutation: regenerateBackupCodes', () => {
    it('should regenerate backup codes with valid password', async () => {
      const mockGenerateBackupCodes = jest
        .spyOn(TwoFactorService.prototype, 'generateBackupCodes')
        .mockResolvedValue(['NEW1', 'NEW2', 'NEW3']);
      jest.spyOn(EmailService.prototype, 'sendBackupCodes').mockResolvedValue();

      const result = await twoFactorResolvers.Mutation.regenerateBackupCodes(
        null,
        { password: 'password123' },
        context
      );

      expect(result).toEqual(['NEW1', 'NEW2', 'NEW3']);
      expect(mockGenerateBackupCodes).toHaveBeenCalledWith(testUser.id);
    });

    it('should reject incorrect password', async () => {
      await expect(
        twoFactorResolvers.Mutation.regenerateBackupCodes(
          null,
          { password: 'wrong-password' },
          context
        )
      ).rejects.toThrow('Invalid password');
    });

    it('should require authentication', async () => {
      const unauthContext = { prisma, redis, user: null };

      await expect(
        twoFactorResolvers.Mutation.regenerateBackupCodes(
          null,
          { password: 'password123' },
          unauthContext
        )
      ).rejects.toThrow('You must be logged in');
    });
  });

  describe('Mutation: loginStep1', () => {
    it('should return pending token for user with 2FA', async () => {
      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          twoFactorEmailEnabled: true,
          twoFactorSmsEnabled: false,
        },
      });

      jest.spyOn(TwoFactorService.prototype, 'sendCode').mockResolvedValue();

      const result = await twoFactorResolvers.Mutation.loginStep1(
        null,
        { email: testUser.email, password: 'password123' },
        { prisma, redis, user: null }
      );

      expect(result.requiresTwoFactor).toBe(true);
      expect(result.pendingToken).toBeDefined();
      expect(result.availableMethods).toContain('EMAIL');

      // Verify token payload
      const decoded = jwt.verify(result.pendingToken!, process.env.JWT_SECRET!) as any;
      expect(decoded.userId).toBe(testUser.id);
      expect(decoded.type).toBe('pending_2fa');
    });

    it('should return full token for user without 2FA', async () => {
      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          twoFactorEmailEnabled: false,
          twoFactorSmsEnabled: false,
        },
      });

      // 2FA is now required, so should throw error for users without it
      await expect(
        twoFactorResolvers.Mutation.loginStep1(
          null,
          { email: testUser.email, password: 'password123' },
          { prisma, redis, user: null }
        )
      ).rejects.toThrow('Two-factor authentication is required');
    });

    it('should send codes to all enabled methods', async () => {
      const twoFactorService = new TwoFactorService();
      const encryptedPhone = twoFactorService.encryptPhoneNumber('+1234567890');

      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          twoFactorEmailEnabled: true,
          twoFactorSmsEnabled: true,
          phoneNumber: encryptedPhone,
        },
      });

      const mockSendCode = jest.spyOn(TwoFactorService.prototype, 'sendCode').mockResolvedValue();

      const result = await twoFactorResolvers.Mutation.loginStep1(
        null,
        { email: testUser.email, password: 'password123' },
        { prisma, redis, user: null }
      );

      expect(mockSendCode).toHaveBeenCalledWith(testUser.id, 'EMAIL', 'LOGIN');
      expect(mockSendCode).toHaveBeenCalledWith(testUser.id, 'SMS', 'LOGIN');
      // Backup codes are always available as a fallback
      expect(result.availableMethods).toContain('EMAIL');
      expect(result.availableMethods).toContain('SMS');
      expect(result.availableMethods).toContain('BACKUP_CODE');
    });

    it('should reject invalid credentials', async () => {
      await expect(
        twoFactorResolvers.Mutation.loginStep1(
          null,
          { email: testUser.email, password: 'wrong-password' },
          { prisma, redis, user: null }
        )
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      await expect(
        twoFactorResolvers.Mutation.loginStep1(
          null,
          { email: 'nonexistent@example.com', password: 'password123' },
          { prisma, redis, user: null }
        )
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('Mutation: loginStep2', () => {
    let pendingToken: string;

    beforeEach(async () => {
      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          twoFactorEmailEnabled: true,
        },
      });

      pendingToken = jwt.sign(
        { userId: testUser.id, type: 'pending_2fa' },
        process.env.JWT_SECRET!,
        { expiresIn: '5m' }
      );
    });

    it('should verify code and return full token', async () => {
      jest.spyOn(TwoFactorService.prototype, 'verifyCode').mockResolvedValue(true);

      const result = await twoFactorResolvers.Mutation.loginStep2(
        null,
        { pendingToken, code: '123456', type: 'EMAIL' },
        { prisma, redis, user: null }
      );

      expect(result.token).toBeDefined();
      expect(result.user).toEqual(
        expect.objectContaining({
          id: testUser.id,
          email: testUser.email,
        })
      );

      // Verify full access token
      const decoded = jwt.verify(result.token, process.env.JWT_SECRET!) as any;
      expect(decoded.id).toBe(testUser.id);
      expect(decoded.type).toBeUndefined(); // Full token doesn't have type
    });

    it('should reject invalid code', async () => {
      jest.spyOn(TwoFactorService.prototype, 'verifyCode').mockResolvedValue(false);

      await expect(
        twoFactorResolvers.Mutation.loginStep2(
          null,
          { pendingToken, code: '999999', type: 'EMAIL' },
          { prisma, redis, user: null }
        )
      ).rejects.toThrow('Invalid verification code');
    });

    it('should reject expired pending token', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser.id, type: 'pending_2fa' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1m' } // Already expired
      );

      await expect(
        twoFactorResolvers.Mutation.loginStep2(
          null,
          { pendingToken: expiredToken, code: '123456', type: 'EMAIL' },
          { prisma, redis, user: null }
        )
      ).rejects.toThrow();
    });

    it('should reject invalid token type', async () => {
      const regularToken = jwt.sign({ id: testUser.id }, process.env.JWT_SECRET!);

      await expect(
        twoFactorResolvers.Mutation.loginStep2(
          null,
          { pendingToken: regularToken, code: '123456', type: 'EMAIL' },
          { prisma, redis, user: null }
        )
      ).rejects.toThrow('Invalid or expired session');
    });

    it('should verify backup code', async () => {
      jest.spyOn(TwoFactorService.prototype, 'verifyBackupCode').mockResolvedValue(true);

      const result = await twoFactorResolvers.Mutation.loginStep2(
        null,
        { pendingToken, code: 'BACKUP01', type: 'BACKUP_CODE' },
        { prisma, redis, user: null }
      );

      expect(result.token).toBeDefined();
      expect(result.user.id).toBe(testUser.id);
    });
  });
});
