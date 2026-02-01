import { PrismaClient } from '@prisma/client';
import { fieldEncryptionExtension } from 'prisma-field-encryption';

async function validateEncryption() {
  // Extended client (encrypts/decrypts)
  const prisma = new PrismaClient().$extends(fieldEncryptionExtension());
  // Raw client (no encryption - reads raw database values)
  const rawPrisma = new PrismaClient();

  const testAccessToken = 'access-test-' + Date.now();
  const testPlaidItemId = 'test-item-' + Date.now();
  let testUserId: string | null = null;
  let testItemId: string | null = null;

  try {
    // 1. Get or create a test user
    let testUser = await rawPrisma.user.findFirst();
    if (!testUser) {
      testUser = await rawPrisma.user.create({
        data: {
          email: `encryption-test-${Date.now()}@test.com`,
          name: 'Encryption Test User',
        },
      });
      testUserId = testUser.id;
    }

    // 2. Create a PlaidItem with the encrypted client
    const item = await prisma.plaidItem.create({
      data: {
        userId: testUser.id,
        accessToken: testAccessToken,
        plaidItemId: testPlaidItemId,
        plaidInstitutionId: 'ins_test',
        institutionName: 'Test Bank',
      },
    });
    testItemId = item.id;
    console.log('Created PlaidItem with id:', item.id);

    // 3. Read raw database value (should be encrypted, NOT plaintext)
    const rawItem = await rawPrisma.plaidItem.findUnique({
      where: { id: item.id },
    });

    if (!rawItem) {
      throw new Error('FAIL: PlaidItem not found in database');
    }

    if (rawItem.accessToken === testAccessToken) {
      throw new Error(
        'FAIL: accessToken is stored in PLAINTEXT! Encryption is NOT working.'
      );
    }

    console.log('Raw DB value (encrypted):', rawItem.accessToken.substring(0, 50) + '...');
    console.log('PASS: accessToken is encrypted at rest');

    // 4. Read through encrypted client (should decrypt)
    const decryptedItem = await prisma.plaidItem.findUnique({
      where: { id: item.id },
    });

    if (!decryptedItem) {
      throw new Error('FAIL: Could not read PlaidItem through encrypted client');
    }

    if (decryptedItem.accessToken !== testAccessToken) {
      throw new Error(
        `FAIL: Decrypted value doesn't match. Expected: ${testAccessToken}, Got: ${decryptedItem.accessToken}`
      );
    }

    console.log('Decrypted value matches original');
    console.log('PASS: Encryption and decryption working correctly');

    // 5. Verify hash field is populated (if supported)
    if (rawItem.accessTokenHash) {
      console.log('PASS: accessTokenHash is populated for searchability');
    } else {
      console.log('INFO: accessTokenHash is null (may need explicit configuration)');
    }

    console.log('\n=== ALL ENCRYPTION VALIDATIONS PASSED ===');
  } catch (error) {
    console.error('\n=== ENCRYPTION VALIDATION FAILED ===');
    console.error(error);
    process.exit(1);
  } finally {
    // Cleanup
    if (testItemId) {
      await rawPrisma.plaidItem.delete({ where: { id: testItemId } }).catch(() => {});
    }
    if (testUserId) {
      await rawPrisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    await rawPrisma.$disconnect();
    await (prisma as any).$disconnect();
    process.exit(0);
  }
}

validateEncryption();
