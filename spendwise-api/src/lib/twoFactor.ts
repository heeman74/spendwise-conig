import { hash, compare } from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from './prisma';
import { redis } from './redis';
import { emailService } from './email';
import { smsService } from './sms';
import { TwoFactorType, TwoFactorPurpose, TwoFactorEvent } from '@prisma/client';

export class TwoFactorService {
  private CODE_LENGTH = 6;
  private CODE_EXPIRY_MINUTES = 1; // 1 minute expiration
  private MAX_ATTEMPTS = 3;
  private RATE_LIMIT_WINDOW = 60; // seconds
  private MAX_CODES_PER_WINDOW = 3;

  // Generate random 6-digit code
  private generateCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Check rate limiting using Redis
  async checkRateLimit(userId: string, type: TwoFactorType): Promise<boolean> {
    const key = `2fa:ratelimit:${userId}:${type}`;

    try {
      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, this.RATE_LIMIT_WINDOW);
      }

      return count <= this.MAX_CODES_PER_WINDOW;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // If Redis fails, allow the request
      return true;
    }
  }

  // Create and send 2FA code
  async sendCode(
    userId: string,
    type: TwoFactorType,
    purpose: TwoFactorPurpose
  ): Promise<void> {
    // Check rate limit
    const canSend = await this.checkRateLimit(userId, type);
    if (!canSend) {
      throw new Error('Too many code requests. Please wait before trying again.');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    // Invalidate previous codes of same type and purpose
    await prisma.twoFactorCode.updateMany({
      where: { userId, type, purpose, verified: false },
      data: { verified: true }, // Mark as used to prevent reuse
    });

    // Generate new code
    const code = this.generateCode();
    const hashedCode = await hash(code, 12);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.CODE_EXPIRY_MINUTES);

    // Store in database
    await prisma.twoFactorCode.create({
      data: {
        userId,
        code: hashedCode,
        type,
        purpose,
        expiresAt,
      },
    });

    // Send via appropriate channel
    if (type === TwoFactorType.EMAIL) {
      await emailService.sendTwoFactorCode(user.email, code, this.CODE_EXPIRY_MINUTES);
    } else if (type === TwoFactorType.SMS) {
      if (!user.phoneNumber) throw new Error('Phone number not configured');
      const phoneNumber = this.decryptPhoneNumber(user.phoneNumber);
      await smsService.sendTwoFactorCode(phoneNumber, code);
    }

    // Log event
    await this.logEvent(userId, TwoFactorEvent.CODE_SENT, type, true);
  }

  // Verify 2FA code
  async verifyCode(
    userId: string,
    code: string,
    type: TwoFactorType,
    purpose: TwoFactorPurpose
  ): Promise<boolean> {
    const record = await prisma.twoFactorCode.findFirst({
      where: {
        userId,
        type,
        purpose,
        verified: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      await this.logEvent(userId, TwoFactorEvent.CODE_FAILED, type, false);
      return false;
    }

    // Check attempts
    if (record.attempts >= this.MAX_ATTEMPTS) {
      await this.logEvent(userId, TwoFactorEvent.CODE_FAILED, type, false);
      throw new Error('Too many failed attempts. Please request a new code.');
    }

    // Verify code
    const isValid = await compare(code, record.code);

    if (isValid) {
      await prisma.twoFactorCode.update({
        where: { id: record.id },
        data: { verified: true },
      });
      await this.logEvent(userId, TwoFactorEvent.CODE_VERIFIED, type, true);
      return true;
    } else {
      await prisma.twoFactorCode.update({
        where: { id: record.id },
        data: { attempts: record.attempts + 1 },
      });
      await this.logEvent(userId, TwoFactorEvent.CODE_FAILED, type, false);
      return false;
    }
  }

  // Generate backup codes (10 codes, 8 characters each)
  async generateBackupCodes(userId: string): Promise<string[]> {
    const codes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < 10; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
      hashedCodes.push(await hash(code, 12));
    }

    // Store hashed codes
    await prisma.user.update({
      where: { id: userId },
      data: { backupCodes: JSON.stringify(hashedCodes) },
    });

    return codes; // Return plain codes ONCE for user to save
  }

  // Verify backup code
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.backupCodes) return false;

    const hashedCodes: string[] = JSON.parse(user.backupCodes);

    for (let i = 0; i < hashedCodes.length; i++) {
      const isValid = await compare(code, hashedCodes[i]);
      if (isValid) {
        // Remove used code
        hashedCodes.splice(i, 1);
        await prisma.user.update({
          where: { id: userId },
          data: { backupCodes: JSON.stringify(hashedCodes) },
        });

        await this.logEvent(userId, TwoFactorEvent.BACKUP_CODE_USED, TwoFactorType.BACKUP_CODE, true);
        return true;
      }
    }

    return false;
  }

  // Get remaining backup codes count
  async getBackupCodesCount(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.backupCodes) return 0;

    try {
      const hashedCodes: string[] = JSON.parse(user.backupCodes);
      return hashedCodes.length;
    } catch {
      return 0;
    }
  }

  // Encrypt phone number using AES-256-GCM
  encryptPhoneNumber(phone: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(phone, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  // Decrypt phone number
  decryptPhoneNumber(encrypted: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
    const parts = encrypted.split(':');

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Mask phone number for display (e.g., +1 ***-***-1234)
  maskPhoneNumber(phone: string): string {
    if (!phone) return '';

    try {
      const decrypted = this.decryptPhoneNumber(phone);
      if (decrypted.length <= 7) return '***-****';

      const lastFour = decrypted.slice(-4);
      const countryCode = decrypted.slice(0, 2);
      return `${countryCode} ***-***-${lastFour}`;
    } catch {
      return '***-****';
    }
  }

  // Mask email for display (e.g., j***@example.com)
  maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 1) return `${local}***@${domain}`;
    return local[0] + '***@' + domain;
  }

  // Log 2FA events
  async logEvent(
    userId: string,
    event: TwoFactorEvent,
    type: TwoFactorType | null,
    success: boolean,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await prisma.twoFactorLog.create({
        data: {
          userId,
          event,
          type,
          success,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });
    } catch (error) {
      console.error('Failed to log 2FA event:', error);
      // Don't throw - logging failure shouldn't block the flow
    }
  }

  // Validate phone number format
  validatePhoneNumber(phone: string): boolean {
    return smsService.validatePhoneNumber(phone);
  }
}

export const twoFactorService = new TwoFactorService();
