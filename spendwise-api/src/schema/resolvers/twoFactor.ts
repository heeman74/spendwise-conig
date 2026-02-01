import { GraphQLError } from 'graphql';
import { hash, compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Context } from '../../context';
import { requireAuth } from '../../middleware/authMiddleware';
import { twoFactorService } from '../../lib/twoFactor';
import { emailService } from '../../lib/email';
import { smsService } from '../../lib/sms';
import { signToken } from '../../context/auth';
import { TwoFactorType, TwoFactorPurpose, TwoFactorEvent } from '@prisma/client';

export const twoFactorResolvers = {
  Query: {
    twoFactorStatus: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context);

      const fullUser = await context.prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!fullUser) {
        throw new GraphQLError('User not found');
      }

      const backupCodesRemaining = await twoFactorService.getBackupCodesCount(user.id);

      return {
        emailEnabled: fullUser.twoFactorEmailEnabled,
        smsEnabled: fullUser.twoFactorSmsEnabled,
        emailVerified: fullUser.emailVerified,
        phoneVerified: fullUser.phoneVerified,
        phoneNumber: fullUser.phoneNumber
          ? twoFactorService.maskPhoneNumber(fullUser.phoneNumber)
          : null,
        backupCodesRemaining,
      };
    },
  },

  Mutation: {
    sendSetupCode: async (
      _: unknown,
      { type, phoneNumber }: { type: TwoFactorType; phoneNumber?: string },
      context: Context
    ) => {
      const user = requireAuth(context);

      // If SMS, validate and store phone number
      if (type === TwoFactorType.SMS) {
        if (!phoneNumber) {
          throw new GraphQLError('Phone number required for SMS setup', {
            extensions: { code: 'PHONE_REQUIRED' },
          });
        }

        // Validate phone format
        const isValidPhone = twoFactorService.validatePhoneNumber(phoneNumber);
        if (!isValidPhone) {
          throw new GraphQLError('Invalid phone number format. Use E.164 format (e.g., +1234567890)', {
            extensions: { code: 'INVALID_PHONE_NUMBER' },
          });
        }

        // Encrypt and store phone
        const encrypted = twoFactorService.encryptPhoneNumber(phoneNumber);
        await context.prisma.user.update({
          where: { id: user.id },
          data: { phoneNumber: encrypted },
        });
      }

      // Send code
      await twoFactorService.sendCode(user.id, type, TwoFactorPurpose.SETUP);

      // Log event
      await twoFactorService.logEvent(user.id, TwoFactorEvent.SETUP_STARTED, type, true);

      return {
        success: true,
        expiresInMinutes: 1,
        codeSentTo: type === TwoFactorType.EMAIL
          ? twoFactorService.maskEmail(user.email)
          : phoneNumber ? twoFactorService.maskPhoneNumber(twoFactorService.encryptPhoneNumber(phoneNumber)) : '',
      };
    },

    enableTwoFactor: async (
      _: unknown,
      { type, code }: { type: TwoFactorType; code: string },
      context: Context
    ) => {
      const user = requireAuth(context);

      // Verify code
      const isValid = await twoFactorService.verifyCode(
        user.id,
        code,
        type,
        TwoFactorPurpose.SETUP
      );

      if (!isValid) {
        throw new GraphQLError('Invalid or expired verification code', {
          extensions: { code: 'INVALID_2FA_CODE' },
        });
      }

      // Generate backup codes
      const backupCodes = await twoFactorService.generateBackupCodes(user.id);

      // Enable 2FA
      const updateData: Record<string, any> = {};
      if (type === TwoFactorType.EMAIL) {
        updateData.twoFactorEmailEnabled = true;
        updateData.emailVerified = true;
      } else if (type === TwoFactorType.SMS) {
        updateData.twoFactorSmsEnabled = true;
        updateData.phoneVerified = true;
      }

      await context.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      // Log event
      await twoFactorService.logEvent(user.id, TwoFactorEvent.SETUP_COMPLETED, type, true);

      // Send notification
      try {
        await emailService.send2FAEnabledNotification(
          user.email,
          type === TwoFactorType.EMAIL ? 'email' : 'sms'
        );

        // If SMS was enabled, also send SMS notification
        if (type === TwoFactorType.SMS) {
          const fullUser = await context.prisma.user.findUnique({ where: { id: user.id } });
          if (fullUser?.phoneNumber) {
            const phoneNumber = twoFactorService.decryptPhoneNumber(fullUser.phoneNumber);
            await smsService.send2FAEnabledNotification(phoneNumber);
          }
        }
      } catch (error) {
        console.error('Failed to send 2FA enabled notification:', error);
        // Don't throw - notification failure shouldn't block the flow
      }

      return {
        success: true,
        backupCodes, // ONLY time backup codes are shown in plain text
        message: 'Two-factor authentication enabled. Save your backup codes securely.',
      };
    },

    disableTwoFactor: async (
      _: unknown,
      { type, code }: { type: TwoFactorType; code: string },
      context: Context
    ) => {
      const user = requireAuth(context);

      // First, send a code for verification
      await twoFactorService.sendCode(user.id, type, TwoFactorPurpose.DISABLE);

      // Verify code
      const isValid = await twoFactorService.verifyCode(
        user.id,
        code,
        type,
        TwoFactorPurpose.DISABLE
      );

      if (!isValid) {
        throw new GraphQLError('Invalid verification code', {
          extensions: { code: 'INVALID_2FA_CODE' },
        });
      }

      // Disable 2FA
      const updateData: Record<string, any> = {};
      if (type === TwoFactorType.EMAIL) {
        updateData.twoFactorEmailEnabled = false;
      } else if (type === TwoFactorType.SMS) {
        updateData.twoFactorSmsEnabled = false;
      }

      await context.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      // Log event
      await twoFactorService.logEvent(user.id, TwoFactorEvent.DISABLED, type, true);

      // Send notification
      try {
        await emailService.send2FADisabledNotification(
          user.email,
          type === TwoFactorType.EMAIL ? 'email' : 'sms'
        );
      } catch (error) {
        console.error('Failed to send 2FA disabled notification:', error);
      }

      return true;
    },

    regenerateBackupCodes: async (
      _: unknown,
      { password }: { password: string },
      context: Context
    ) => {
      const user = requireAuth(context);

      // Verify password before regenerating
      const fullUser = await context.prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!fullUser?.password) {
        throw new GraphQLError('Invalid request');
      }

      const isValid = await compare(password, fullUser.password);
      if (!isValid) {
        throw new GraphQLError('Invalid password', {
          extensions: { code: 'INVALID_PASSWORD' },
        });
      }

      // Generate new backup codes
      const backupCodes = await twoFactorService.generateBackupCodes(user.id);

      // Send via email for safekeeping
      try {
        await emailService.sendBackupCodes(user.email, backupCodes);
      } catch (error) {
        console.error('Failed to send backup codes email:', error);
      }

      return backupCodes;
    },

    loginStep1: async (
      _: unknown,
      { email, password }: { email: string; password: string },
      context: Context
    ) => {
      const user = await context.prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.password) {
        throw new GraphQLError('Invalid credentials', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const isValid = await compare(password, user.password);

      if (!isValid) {
        throw new GraphQLError('Invalid credentials', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Check if 2FA is enabled
      const has2FA = user.twoFactorEmailEnabled || user.twoFactorSmsEnabled;

      if (!has2FA) {
        // No 2FA - this shouldn't happen since 2FA is required,
        // but return flag indicating setup is needed
        throw new GraphQLError('Two-factor authentication is required. Please set up 2FA.', {
          extensions: {
            code: '2FA_SETUP_REQUIRED',
            requiresSetup: true,
          },
        });
      }

      // 2FA required - issue pending token
      const pendingToken = jwt.sign(
        {
          userId: user.id,
          type: 'pending_2fa',
        },
        process.env.JWT_SECRET!,
        { expiresIn: '5m' }
      );

      // Send codes to enabled methods
      const availableMethods: TwoFactorType[] = [TwoFactorType.BACKUP_CODE];

      if (user.twoFactorEmailEnabled) {
        try {
          await twoFactorService.sendCode(user.id, TwoFactorType.EMAIL, TwoFactorPurpose.LOGIN);
          availableMethods.push(TwoFactorType.EMAIL);
        } catch (error) {
          console.error('Failed to send email 2FA code:', error);
        }
      }

      if (user.twoFactorSmsEnabled) {
        try {
          await twoFactorService.sendCode(user.id, TwoFactorType.SMS, TwoFactorPurpose.LOGIN);
          availableMethods.push(TwoFactorType.SMS);
        } catch (error) {
          console.error('Failed to send SMS 2FA code:', error);
        }
      }

      return {
        requiresTwoFactor: true,
        pendingToken,
        availableMethods,
      };
    },

    loginStep2: async (
      _: unknown,
      {
        pendingToken,
        code,
        type,
      }: {
        pendingToken: string;
        code: string;
        type: TwoFactorType;
      },
      context: Context
    ) => {
      // Verify pending token
      let decoded: any;
      try {
        decoded = jwt.verify(pendingToken, process.env.JWT_SECRET!);
        if (decoded.type !== 'pending_2fa') {
          throw new Error('Invalid token type');
        }
      } catch {
        throw new GraphQLError('Invalid or expired session', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const userId = decoded.userId;

      // Verify 2FA code
      let isValid = false;

      if (type === TwoFactorType.BACKUP_CODE) {
        isValid = await twoFactorService.verifyBackupCode(userId, code);
      } else {
        isValid = await twoFactorService.verifyCode(userId, code, type, TwoFactorPurpose.LOGIN);
      }

      if (!isValid) {
        throw new GraphQLError('Invalid verification code', {
          extensions: { code: 'INVALID_2FA_CODE' },
        });
      }

      // Issue full access token
      const user = await context.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new GraphQLError('User not found');
      }

      const token = signToken(user);

      return {
        token,
        user,
      };
    },
  },
};
