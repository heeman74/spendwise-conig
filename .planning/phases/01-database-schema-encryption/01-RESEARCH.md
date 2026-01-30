# Phase 1: Database Schema & Encryption - Research

**Researched:** 2026-01-30
**Domain:** Database schema design, field-level encryption, Plaid API integration
**Confidence:** HIGH

## Summary

This phase extends the existing Prisma schema to support Plaid financial data integration with encrypted token storage. The research identifies the complete Plaid data model, establishes field-level encryption patterns using Prisma Client extensions, and maps out safe schema migration strategies.

Plaid's API returns four primary data types that require database representation: Items (institution connections with access tokens), Accounts (linked bank accounts), Transactions (financial activity), and Investments (holdings and securities). The existing SpendWise schema already has Account and Transaction models that need extension, not replacement, to support both manual and Plaid-linked accounts.

Field-level encryption in Prisma is achieved through Client extensions (not deprecated middleware) using the `prisma-field-encryption` library with AES-256-GCM. This provides transparent encryption/decryption with proper key management, though with important limitations around querying and indexing encrypted fields.

**Primary recommendation:** Use Prisma Client extensions with `prisma-field-encryption` for AES-256-GCM encryption of Plaid access tokens. Extend existing Account and Transaction models with optional Plaid-specific fields. Create new PlaidItem, InvestmentHolding, Security, and RecurringTransaction models. Follow the expand-and-contract pattern for safe migrations.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 5.10.0 (existing) | ORM with type-safe migrations | Already in use; excellent TypeScript support |
| `prisma-field-encryption` | Latest | Field-level encryption via Client extensions | Official pattern for Prisma encryption; AES-256-GCM support |
| Node.js `crypto` | Built-in | AES-256-GCM encryption primitives | Native, no dependencies, battle-tested |
| PostgreSQL | 16 (existing) | Primary database | Already in use; excellent encryption support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@47ng/cloak` | Latest (dependency of prisma-field-encryption) | Key management utilities | Automatic with prisma-field-encryption |
| `dotenv` | Existing | Environment variable management | Development only; use secrets manager in production |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| prisma-field-encryption | Custom middleware | Middleware deprecated in Prisma v6.14.0; extensions are standard |
| Field-level encryption | Full database encryption (TDE) | TDE encrypts entire DB but doesn't allow selective field encryption; increases backup complexity |
| Environment variables | AWS Secrets Manager / HashiCorp Vault | Production should use secrets manager; env vars acceptable for development |

**Installation:**
```bash
npm install prisma-field-encryption
```

## Architecture Patterns

### Recommended Database Structure

```
prisma/schema.prisma
├── Existing Models (extend, don't replace):
│   ├── User (no changes)
│   ├── Account (add plaidAccountId, plaidItemId, isLinked)
│   ├── Transaction (add plaidTransactionId, pending, personalFinanceCategory)
│   └── SavingsGoal (no changes)
│
└── New Models:
    ├── PlaidItem (institution connection + encrypted access token)
    ├── InvestmentHolding (security positions)
    ├── Security (stocks, bonds, ETFs)
    └── RecurringTransaction (subscription detection)
```

### Pattern 1: Extending Existing Models (Expand-and-Contract)

**What:** Add optional Plaid-specific fields to existing Account and Transaction models without breaking manual entries.

**When to use:** When existing models have overlapping concerns with new integration.

**Example:**
```typescript
// Source: https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations

model Account {
  id            String        @id @default(cuid())
  userId        String
  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  name          String
  type          AccountType
  balance       Decimal       @db.Decimal(12, 2)
  institution   String
  lastSynced    DateTime?

  // NEW: Plaid integration fields (all optional for backward compatibility)
  plaidAccountId  String?     // Plaid's unique account identifier
  plaidItemId     String?     // Links to PlaidItem
  plaidItem       PlaidItem?  @relation(fields: [plaidItemId], references: [id])
  isLinked        Boolean     @default(false) // Manual vs Plaid-linked
  mask            String?     // Last 4 digits
  officialName    String?     // Institution's account name

  transactions  Transaction[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([userId])
  @@index([plaidAccountId]) // NEW
}
```

### Pattern 2: Field-Level Encryption with Prisma Client Extensions

**What:** Use `prisma-field-encryption` to transparently encrypt/decrypt sensitive fields.

**When to use:** For fields containing secrets (access tokens, API keys) that must be encrypted at rest.

**Example:**
```typescript
// Source: https://github.com/47ng/prisma-field-encryption

// 1. Schema annotation
model PlaidItem {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Encrypted field with hash for exact matching
  accessToken       String   /// @encrypted
  accessTokenHash   String?  /// @encryption:hash(accessToken)

  plaidItemId       String   @unique
  plaidInstitutionId String
  institutionName   String
  status            String   @default("active")

  // For webhook-driven updates
  transactionsCursor String?

  accounts          Account[]
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([userId])
  @@index([plaidItemId])
}

// 2. Client extension setup (in lib/prisma.ts or similar)
import { PrismaClient } from '@prisma/client';
import { fieldEncryptionExtension } from 'prisma-field-encryption';

const prisma = new PrismaClient().$extends(
  fieldEncryptionExtension()
);

export default prisma;

// 3. Usage (transparent encryption/decryption)
const item = await prisma.plaidItem.create({
  data: {
    userId: user.id,
    accessToken: plaidAccessToken, // Automatically encrypted
    plaidItemId: 'item_123',
    plaidInstitutionId: 'ins_1',
    institutionName: 'Chase',
  }
});

// When retrieved, accessToken is automatically decrypted
const retrieved = await prisma.plaidItem.findUnique({
  where: { id: item.id }
});
console.log(retrieved.accessToken); // Decrypted value
```

### Pattern 3: AES-256-GCM Encryption (if manual implementation needed)

**What:** Native Node.js crypto module implementation for AES-256-GCM.

**When to use:** If building custom encryption outside Prisma (not recommended for this phase).

**Example:**
```typescript
// Source: https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81
import crypto from 'crypto';

function encrypt(plaintext: string, key: Buffer): {
  ciphertext: string;
  iv: string;
  authTag: string;
} {
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64')
  };
}

function decrypt(
  ciphertext: string,
  key: Buffer,
  iv: string,
  authTag: string
): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(iv, 'base64')
  );

  decipher.setAuthTag(Buffer.from(authTag, 'base64'));

  let decrypted = decipher.update(Buffer.from(ciphertext, 'base64'));
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}
```

### Pattern 4: Investment Data Structure

**What:** Normalize investment holdings and securities per Plaid's data model.

**When to use:** Supporting investment accounts and portfolio tracking.

**Example:**
```typescript
// Source: https://plaid.com/docs/api/products/investments/#investmentsholdingsget

model Security {
  id                  String              @id @default(cuid())
  plaidSecurityId     String              @unique
  name                String              // "Apple Inc."
  tickerSymbol        String?             // "AAPL"
  type                String              // "equity", "etf", "mutual fund"
  closePrice          Decimal?            @db.Decimal(12, 4)
  sector              String?
  industry            String?
  holdings            InvestmentHolding[]
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt

  @@index([plaidSecurityId])
}

model InvestmentHolding {
  id                  String   @id @default(cuid())
  accountId           String
  account             Account  @relation(fields: [accountId], references: [id], onDelete: Cascade)
  securityId          String
  security            Security @relation(fields: [securityId], references: [id])

  quantity            Decimal  @db.Decimal(12, 6)
  institutionPrice    Decimal  @db.Decimal(12, 4)
  institutionValue    Decimal  @db.Decimal(12, 2)
  costBasis           Decimal? @db.Decimal(12, 2)
  isoCurrencyCode     String?

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([accountId])
  @@index([securityId])
}
```

### Pattern 5: Recurring Transaction Detection

**What:** Store Plaid's recurring transaction detection results for subscription tracking.

**When to use:** Identifying subscriptions and recurring bills.

**Example:**
```typescript
// Source: https://plaid.com/docs/api/products/transactions/#transactionsrecurringget

model RecurringTransaction {
  id                    String   @id @default(cuid())
  userId                String
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  plaidStreamId         String   @unique

  // Stream metadata
  description           String
  merchantName          String?
  category              String
  frequency             String   // "WEEKLY", "MONTHLY", etc.
  isActive              Boolean  @default(true)

  // Amount patterns
  lastAmount            Decimal  @db.Decimal(12, 2)
  averageAmount         Decimal  @db.Decimal(12, 2)

  // Timing
  lastDate              DateTime
  firstDate             DateTime

  // Plaid metadata
  transactionIds        String[] // Array of transaction IDs in this stream

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([userId])
  @@index([plaidStreamId])
}
```

### Anti-Patterns to Avoid

- **Storing access tokens in plaintext:** Always encrypt. Plaid access tokens don't expire and grant full account access.
- **Using middleware for encryption:** Middleware was deprecated in Prisma v4.16.0 and removed in v6.14.0. Use Client extensions.
- **Indexing encrypted fields:** Encrypted values are non-deterministic (random IVs). Use hash fields for exact matching.
- **Making Plaid fields required on existing models:** Breaks manual accounts. All Plaid fields must be optional.
- **Storing duplicate institution connections without deduplication:** Costs money per Item. Check `plaidInstitutionId` before token exchange.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Field-level encryption | Custom crypto + Prisma hooks | `prisma-field-encryption` | Handles IV generation, auth tags, key rotation, hash fields automatically |
| Encryption key management | .env file storage in production | AWS Secrets Manager, HashiCorp Vault | Environment variables stored in plaintext; secrets managers provide rotation, audit logs, access control |
| Recurring transaction detection | Pattern matching on transaction descriptions | Plaid's `/transactions/recurring/get` API | Plaid analyzes 180+ days of history with maturity thresholds, excludes habitual spending |
| Database migrations | Manual SQL scripts | Prisma Migrate with expand-and-contract | Type-safe migrations, automatic rollback, tracks migration history |

**Key insight:** Encryption is complex. Random IVs, authentication tags, and key rotation are error-prone when hand-rolled. Use established libraries that handle edge cases.

## Common Pitfalls

### Pitfall 1: Breaking Existing Manual Accounts

**What goes wrong:** Adding required Plaid fields to Account or Transaction models causes validation errors for existing manual entries.

**Why it happens:** Developers assume all accounts will eventually be Plaid-linked, or forget about existing manual data.

**How to avoid:**
- Make all Plaid-specific fields optional (`String?` not `String`)
- Use `isLinked` boolean flag to distinguish manual vs Plaid accounts
- Test migrations against production-like data with manual accounts

**Warning signs:** Migration fails with "NOT NULL constraint violation" on existing rows.

### Pitfall 2: Storing Encryption Keys in Environment Variables (Production)

**What goes wrong:** Encryption keys stored in `.env` files or plain environment variables are visible to anyone with server access.

**Why it happens:** Environment variables work great in development and seem "secure enough."

**How to avoid:**
- Development: `.env` files are acceptable (never commit to git)
- Production: Use AWS Secrets Manager, Azure Key Vault, or HashiCorp Vault
- Set `NODE_ENV=production` checks to enforce secrets manager usage

**Warning signs:** Security audit flags plaintext keys; compliance violations for PCI-DSS.

### Pitfall 3: Query Performance Degradation with Encrypted Fields

**What goes wrong:** Queries become slow because encrypted fields can't use indexes effectively.

**Why it happens:** AES-256-GCM uses random IVs, making each encryption non-deterministic. Database can't index encrypted values.

**How to avoid:**
- Use hash fields (`/// @encryption:hash(fieldName)`) for exact matching
- Don't add database indexes to encrypted fields themselves
- Query by hash, retrieve encrypted value
- Only encrypt sensitive fields (access tokens, not account names)

**Warning signs:** Full table scans on queries filtering by encrypted fields; slow API responses.

### Pitfall 4: Duplicate Plaid Items Without Deduplication

**What goes wrong:** Users link the same bank account multiple times, creating duplicate Items that each cost money.

**Why it happens:** Plaid Link allows duplicate connections by default.

**How to avoid:**
```typescript
// Check before token exchange
const existing = await prisma.plaidItem.findFirst({
  where: {
    userId: user.id,
    plaidInstitutionId: institutionId
  }
});

if (existing) {
  throw new Error('Institution already linked');
}
```

**Warning signs:** Unexpected Plaid billing; users see duplicate accounts.

### Pitfall 5: Not Handling Item Status Changes

**What goes wrong:** Plaid Items enter `ITEM_LOGIN_REQUIRED` state when credentials change, breaking data sync.

**Why it happens:** No webhook listener for `PENDING_DISCONNECT` or `ERROR` events; no user flow to re-authenticate.

**How to avoid:**
- Add `status` field to PlaidItem model
- Implement webhook endpoint listening for `PENDING_DISCONNECT`, `ERROR`, `LOGIN_REPAIRED`
- Update status in database; notify user to re-link
- Implement Link update mode flow

**Warning signs:** Transactions stop syncing silently; users don't know authentication failed.

### Pitfall 6: Encryption Key Rotation Without Old Key Retention

**What goes wrong:** Rotating encryption keys without keeping old keys makes existing encrypted data unreadable.

**Why it happens:** Developers assume new key replaces old key entirely.

**How to avoid:**
- Keep multiple decryption keys via `PRISMA_FIELD_DECRYPTION_KEYS` (comma-separated)
- One encryption key (`PRISMA_FIELD_ENCRYPTION_KEY`), multiple decryption keys
- Re-encrypt data gradually; only remove old key after verification
- Wait 2+ hours after re-encryption before disabling old key access

**Warning signs:** Database reads fail with "bad decrypt" errors after key rotation.

### Pitfall 7: Logical Backups Expose Encrypted Data

**What goes wrong:** `pg_dump` backups contain encrypted data in plaintext form.

**Why it happens:** `pg_dump` fetches data via SQL, which returns decrypted values if application-level encryption is used.

**How to avoid:**
- Field-level encryption only protects data at rest in database files
- Backup files should be encrypted separately (GPG, AWS S3 encryption)
- Consider PostgreSQL TDE for full database encryption (complex, performance impact)
- Restrict access to backup files; store in encrypted volumes

**Warning signs:** Plaintext sensitive data in backup files; compliance audit failures.

## Code Examples

Verified patterns from official sources:

### Complete PlaidItem Model
```prisma
// Source: https://github.com/plaid/pattern/blob/master/database/init/create.sql
// Enhanced with encryption per https://github.com/47ng/prisma-field-encryption

model PlaidItem {
  id                    String    @id @default(cuid())
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Encrypted access token
  accessToken           String    /// @encrypted
  accessTokenHash       String?   /// @encryption:hash(accessToken)

  // Plaid identifiers
  plaidItemId           String    @unique
  plaidInstitutionId    String
  institutionName       String

  // Connection status
  status                String    @default("active") // "active", "error", "pending_disconnect"

  // Webhook-driven cursor for transaction sync
  transactionsCursor    String?

  // OAuth token expiration (for OAuth-based institutions)
  consentExpirationTime DateTime?

  // Relations
  accounts              Account[]

  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([userId])
  @@index([plaidItemId])
  @@index([status])
}
```

### Environment Variable Setup
```bash
# Source: https://github.com/47ng/prisma-field-encryption

# Development (.env)
PRISMA_FIELD_ENCRYPTION_KEY=your-32-byte-base64-key-here
DATABASE_URL=postgresql://user:pass@localhost:5433/spendwise

# Production (use secrets manager to inject these)
PRISMA_FIELD_ENCRYPTION_KEY=${AWS_SECRET_ENCRYPTION_KEY}
PRISMA_FIELD_DECRYPTION_KEYS=${AWS_SECRET_OLD_KEY_1},${AWS_SECRET_OLD_KEY_2}
```

### Key Generation Script
```typescript
// Source: https://nodejs.org/api/crypto.html
import crypto from 'crypto';

// Generate a 256-bit (32-byte) encryption key
const key = crypto.randomBytes(32).toString('base64');
console.log('PRISMA_FIELD_ENCRYPTION_KEY=' + key);

// Example output:
// PRISMA_FIELD_ENCRYPTION_KEY=8xf7wqR5vH2nK9mL4jP3sT6uY1zC0dE8
```

### Safe Migration: Adding Plaid Fields to Account
```typescript
// Source: https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations

// 1. Update schema.prisma
model Account {
  // ... existing fields ...

  // NEW: Add optional Plaid fields
  plaidAccountId  String?
  plaidItemId     String?
  plaidItem       PlaidItem? @relation(fields: [plaidItemId], references: [id])
  isLinked        Boolean    @default(false)

  // ... rest of model ...
}

// 2. Create migration
// npm run db:generate -- --name add_plaid_fields_to_account --create-only

// 3. Migration automatically creates:
// ALTER TABLE "Account" ADD COLUMN "plaidAccountId" TEXT;
// ALTER TABLE "Account" ADD COLUMN "plaidItemId" TEXT;
// ALTER TABLE "Account" ADD COLUMN "isLinked" BOOLEAN NOT NULL DEFAULT false;

// 4. Apply migration
// npm run db:push
```

### Transaction Extension Fields
```prisma
// Source: https://plaid.com/docs/api/products/transactions/

model Transaction {
  id                    String          @id @default(cuid())
  userId                String
  user                  User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  accountId             String
  account               Account         @relation(fields: [accountId], references: [id], onDelete: Cascade)
  amount                Decimal         @db.Decimal(12, 2)
  type                  TransactionType
  category              String
  merchant              String?
  description           String?
  date                  DateTime

  // NEW: Plaid-specific fields
  plaidTransactionId    String?         @unique
  pending               Boolean         @default(false)
  personalFinanceCategory String?       // Enhanced categorization from Plaid
  paymentChannel        String?         // "online", "in store", "other"

  createdAt             DateTime        @default(now())

  @@index([userId])
  @@index([accountId])
  @@index([date])
  @@index([category])
  @@index([plaidTransactionId]) // NEW
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma Middleware for encryption | Prisma Client Extensions | Deprecated v4.16.0, removed v6.14.0 | Extensions provide type safety, isolation, shared connection pools |
| Polling `/transactions/get` | Webhook + `/transactions/sync` with cursor | 2023+ (Transactions Sync launch) | Reduced API calls, real-time updates, lower costs |
| Manual recurring detection | `/transactions/recurring/get` API | Available in Financial Insights product | Better accuracy, 180-day analysis, maturity thresholds |
| Hardcoded institution list | Dynamic `/institutions/get` | Always available | Real-time institution status, supports new banks automatically |

**Deprecated/outdated:**
- **Prisma Middleware (`prisma.$use()`)**: Removed in v6.14.0; use Client Extensions instead
- **Manual transaction pagination**: Use `/transactions/sync` with cursors, not `/transactions/get` with offsets
- **Polling for updates**: Implement webhooks for real-time Item status and transaction changes

## Open Questions

Things that couldn't be fully resolved:

1. **Investment account support timeline**
   - What we know: Plaid provides `/investments/holdings/get` API; schema structure is clear
   - What's unclear: SpendWise INVESTMENT account type exists but may not have UI support yet
   - Recommendation: Create schema models (Security, InvestmentHolding) but mark as future phase; easy to populate later

2. **AI-powered transaction categorization fields**
   - What we know: Project research mentions AI categorization; Plaid provides `personalFinanceCategory`
   - What's unclear: Whether custom AI categorization fields (confidence scores, suggestions) are needed
   - Recommendation: Start with Plaid's `personalFinanceCategory`; add custom fields in Phase 3 if AI categorization is built

3. **Encryption key rotation schedule**
   - What we know: `prisma-field-encryption` supports multiple decryption keys for rotation
   - What's unclear: How often to rotate; automated rotation strategy
   - Recommendation: Manual rotation initially; consider AWS KMS automatic rotation in future phase

4. **PostgreSQL version-specific encryption features**
   - What we know: Project uses PostgreSQL 16; field-level encryption works at application layer
   - What's unclear: Whether PostgreSQL 16's native encryption features should be considered
   - Recommendation: Stick with application-layer encryption (Prisma extensions); more portable, easier key management

## Sources

### Primary (HIGH confidence)
- [Plaid API - Transactions](https://plaid.com/docs/api/products/transactions/) - Transaction data structure
- [Plaid API - Accounts](https://plaid.com/docs/api/accounts/) - Account data structure
- [Plaid API - Items](https://plaid.com/docs/api/items/) - Item and access token management
- [Plaid API - Investments](https://plaid.com/docs/api/products/investments/) - Holdings and securities structure
- [Plaid API - Webhooks](https://plaid.com/docs/api/webhooks/) - Webhook best practices
- [Plaid Pattern Database Schema](https://github.com/plaid/pattern/blob/master/database/init/create.sql) - Official reference implementation
- [prisma-field-encryption GitHub](https://github.com/47ng/prisma-field-encryption) - Encryption library documentation
- [Prisma Migrate - Customizing Migrations](https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations) - Migration best practices
- [Prisma Client Extensions](https://www.prisma.io/docs/orm/prisma-client/client-extensions) - Extension patterns
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html) - Native AES-256-GCM implementation

### Secondary (MEDIUM confidence)
- [AES-256-GCM Example Gist](https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81) - Node.js crypto patterns verified against official docs
- [Prisma Expand and Contract Pattern](https://www.prisma.io/docs/guides/data-migration) - Safe migration strategies
- [Plaid Recurring Transactions Blog](https://plaid.com/blog/recurring-transactions/) - Feature overview verified with API docs
- [Prisma Middleware Deprecation Discussion](https://www.prisma.io/docs/orm/prisma-client/client-extensions/middleware) - Migration to extensions
- [Crunchy Data - PostgreSQL Encryption Guide](https://www.crunchydata.com/blog/data-encryption-in-postgres-a-guidebook) - Database encryption context

### Tertiary (LOW confidence)
- Various security blog posts about environment variable best practices - General guidance, not Plaid-specific
- Web search results about key management - Principles verified against AWS/official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Plaid documentation and Prisma docs provide clear guidance
- Architecture: HIGH - Plaid Pattern repository shows reference implementation; Prisma migration docs are comprehensive
- Pitfalls: MEDIUM - Gathered from Plaid docs, community discussions, and security best practices; some inferred from common patterns

**Research date:** 2026-01-30
**Valid until:** ~90 days (stable domain; Plaid API and Prisma are mature with infrequent breaking changes)
