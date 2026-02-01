import crypto from 'crypto';

// Generate a 256-bit (32-byte) encryption key for AES-256-GCM
// Used by prisma-field-encryption via PRISMA_FIELD_ENCRYPTION_KEY env var
// Format: k1.aesgcm256.<base64url-encoded-key> (required by @47ng/cloak library)
const keyBytes = crypto.randomBytes(32).toString('base64url');
const key = `k1.aesgcm256.${keyBytes}`;
console.log(`PRISMA_FIELD_ENCRYPTION_KEY=${key}`);
console.log('\nAdd this to your .env file in spendwise-api/');
console.log('IMPORTANT: Never commit this key to version control.');
