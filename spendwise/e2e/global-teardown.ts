import { cleanupRecurringTestDataByEmail, disconnectPrisma } from './helpers/recurring-test-data';

async function globalTeardown() {
  await cleanupRecurringTestDataByEmail();
  await disconnectPrisma();
}

export default globalTeardown;
