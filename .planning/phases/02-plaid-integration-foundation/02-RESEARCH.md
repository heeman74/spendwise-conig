# Phase 02: Plaid Integration Foundation - Research

**Researched:** 2026-01-30
**Domain:** Plaid Link integration, OAuth bank connectivity, financial data aggregation
**Confidence:** HIGH

## Summary

Plaid Link is the industry-standard client-side component for connecting financial institutions to applications. The integration follows a strict server-client architecture: backend creates short-lived `link_token` via `/link/token/create`, frontend opens Plaid Link UI with that token, user authenticates with their bank, Link returns temporary `public_token`, backend exchanges it for permanent `access_token` via `/item/public_token/exchange`, and all subsequent API calls use the `access_token`.

The core pattern is well-established: react-plaid-link (v4.1.1) provides the `usePlaidLink` hook for React, plaid npm package (v41.0.0) handles server-side API calls. Security is paramount: access tokens NEVER touch the client, must be encrypted at rest (already implemented via prisma-field-encryption), and all credentials stay server-side. Update mode handles re-authentication when connections break (ITEM_LOGIN_REQUIRED error), webhooks notify of status changes, and `/item/remove` revokes access when unlinking.

**Primary recommendation:** Use official Plaid SDKs (react-plaid-link + plaid npm), implement webhook verification from day one, use Update mode for all re-auth flows, and treat access_token as highly sensitive (encrypt, never expose client-side).

## Standard Stack

The established libraries/tools for Plaid integration:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| plaid | 41.0.0 | Official Node.js SDK for Plaid API | Maintained by Plaid, updated monthly, includes all endpoints |
| react-plaid-link | 4.1.1 | Official React bindings for Plaid Link | Provides usePlaidLink hook, TypeScript built-in, Plaid-maintained |
| prisma-field-encryption | 1.6.0 (installed) | Transparent field encryption for Prisma | Already in use, encrypts PlaidItem.accessToken at rest |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jose | Latest | JWT verification for webhooks | Webhook security implementation (recommended by Plaid) |
| js-sha256 | Latest | SHA-256 hashing for webhook body verification | Part of webhook verification flow |
| graphql-scalars | 1.22.4 (installed) | Custom GraphQL scalar types | DateTime, JSON scalars for Plaid metadata |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-plaid-link | Manual Link integration via CDN | Hook provides better React integration, error handling, TypeScript support |
| Plaid webhooks | Polling API for status | Webhooks are real-time, polling wastes API calls and has latency |

**Installation:**
```bash
# Backend (spendwise-api/)
npm install plaid jose js-sha256

# Frontend (spendwise/)
npm install react-plaid-link
```

## Architecture Patterns

### Recommended Project Structure

**Backend (spendwise-api/):**
```
src/
├── schema/
│   ├── typeDefs/
│   │   └── plaid.ts              # PlaidItem, PlaidLinkToken, UnlinkResult types
│   └── resolvers/
│       └── plaid.ts              # createLinkToken, exchangePublicToken, unlinkItem
├── lib/
│   ├── plaid-client.ts           # PlaidApi instance initialization
│   └── plaid-webhooks.ts         # Webhook verification + handlers
└── routes/
    └── plaid-webhooks.ts         # Express POST /webhooks/plaid endpoint
```

**Frontend (spendwise/):**
```
src/
├── components/
│   └── plaid/
│       ├── PlaidLinkButton.tsx   # Reusable Link button component
│       ├── LinkSuccessModal.tsx  # Success summary screen
│       └── ReAuthBadge.tsx       # Warning badge for broken connections
├── hooks/
│   └── usePlaidLink.ts           # Custom hook wrapping react-plaid-link
└── graphql/
    ├── queries/
    │   └── plaid.ts              # GET_LINK_TOKEN, GET_PLAID_ITEMS
    └── mutations/
        └── plaid.ts              # EXCHANGE_PUBLIC_TOKEN, UNLINK_ITEM
```

### Pattern 1: Server-Side Link Token Creation
**What:** Backend creates short-lived link_token with user context and configuration
**When to use:** Every time user initiates Plaid Link (connect new bank OR re-authenticate)
**Example:**
```typescript
// Source: https://plaid.com/docs/quickstart/
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

// In resolver
const response = await plaidClient.linkTokenCreate({
  user: { client_user_id: userId },
  client_name: 'SpendWise',
  products: ['transactions', 'auth', 'investments'],
  country_codes: ['US'],
  language: 'en',
  webhook: process.env.PLAID_WEBHOOK_URL,
});

return response.data.link_token;
```

### Pattern 2: React Hook Integration
**What:** Use usePlaidLink hook with link_token from server
**When to use:** Anywhere user can initiate bank connection (accounts page, settings)
**Example:**
```typescript
// Source: https://github.com/plaid/react-plaid-link
import { usePlaidLink } from 'react-plaid-link';

const { open, ready } = usePlaidLink({
  token: linkToken, // from GraphQL query
  onSuccess: async (public_token, metadata) => {
    // Exchange public_token via GraphQL mutation
    await exchangePublicToken({
      variables: { publicToken: public_token }
    });
  },
  onExit: (error, metadata) => {
    if (error?.error_code === 'INVALID_LINK_TOKEN') {
      // Fetch fresh link_token
    }
  },
});

return (
  <button onClick={() => open()} disabled={!ready}>
    Connect Bank
  </button>
);
```

### Pattern 3: Update Mode for Re-Authentication
**What:** Open Link with existing Item's access_token to repair broken connections
**When to use:** ITEM_LOGIN_REQUIRED error from API or webhook
**Example:**
```typescript
// Source: https://plaid.com/docs/link/update-mode/
// Backend: Create link_token with access_token
const response = await plaidClient.linkTokenCreate({
  user: { client_user_id: userId },
  client_name: 'SpendWise',
  access_token: item.accessToken, // Existing Item's access_token
  // No public_token exchange needed - access_token stays the same
});

// Frontend: Same usePlaidLink pattern, but onSuccess updates status
onSuccess: async (public_token, metadata) => {
  // NO token exchange! Just update PlaidItem status to 'active'
  await updateItemStatus({ variables: { itemId: item.id } });
}
```

### Pattern 4: Webhook Verification
**What:** Verify Plaid-Verification JWT header before processing webhooks
**When to use:** Every webhook received (security best practice)
**Example:**
```typescript
// Source: https://plaid.com/docs/api/webhooks/webhook-verification/
import * as jose from 'jose';
import { sha256 } from 'js-sha256';

const verifyWebhook = async (
  body: string,
  headers: Record<string, string>
) => {
  const signedJwt = headers['plaid-verification'];

  // 1. Get JWK from Plaid
  const jwksResponse = await plaidClient.webhookVerificationKeyGet({});
  const jwk = jwksResponse.data.key;

  // 2. Verify JWT signature
  const publicKey = await jose.importJWK(jwk);
  const { payload } = await jose.jwtVerify(signedJwt, publicKey);

  // 3. Check timestamp (< 5 minutes old)
  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime - payload.iat! > 300) {
    throw new Error('Webhook too old');
  }

  // 4. Verify body hash
  const bodyHash = sha256(body);
  if (bodyHash !== payload.request_body_sha256) {
    throw new Error('Body hash mismatch');
  }

  return true;
};
```

### Pattern 5: Transaction Deduplication
**What:** Compare plaidTransactionId to avoid storing duplicates
**When to use:** Every time fetching transactions from Plaid
**Example:**
```typescript
// Source: https://plaid.com/docs/transactions/troubleshooting/
const syncTransactions = async (accessToken: string) => {
  const response = await plaidClient.transactionsSync({
    access_token: accessToken,
    cursor: item.transactionsCursor,
  });

  for (const txn of response.data.added) {
    // Skip if already exists by plaidTransactionId
    const existing = await prisma.transaction.findUnique({
      where: { plaidTransactionId: txn.transaction_id }
    });

    if (!existing) {
      // Handle pending vs posted: check pending_transaction_id
      await prisma.transaction.create({
        data: {
          plaidTransactionId: txn.transaction_id,
          // ... other fields
        }
      });
    }
  }

  // Update cursor for next sync
  await prisma.plaidItem.update({
    where: { id: item.id },
    data: { transactionsCursor: response.data.next_cursor }
  });
};
```

### Anti-Patterns to Avoid

- **Never expose access_token client-side:** Access tokens are permanent credentials, exposing them violates security. Always keep server-side.
- **Don't poll for Item status:** Use webhooks (ITEM: ERROR, ITEM: LOGIN_REPAIRED) instead of polling /item/get repeatedly. Webhooks are real-time and free.
- **Never store link_token long-term:** link_token expires in 30 minutes. Create fresh token each time user opens Link.
- **Don't skip webhook verification:** Even in development, implement verification to catch issues before production.
- **Avoid using public_key authentication:** Public keys deprecated as of February 2025. Use link_token only.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT webhook verification | Custom crypto verification logic | jose library + Plaid's example | Edge cases: key rotation, timing attacks, algorithm verification |
| Duplicate transaction detection | Simple transaction_id lookup | Plaid's recommended pattern with pending_transaction_id | Banks change transaction data, pending vs posted complexity |
| Link UI customization | Build custom bank login forms | Plaid Link customization API (Dashboard) | OAuth flows, MFA, institution-specific quirks, compliance |
| Institution logo hosting | Download/cache logos yourself | Plaid's /institutions/get_by_id with include_optional_metadata | Logos updated by Plaid, licensing handled, 152x152 PNG + brand color |
| Error code mapping | String matching on error messages | GraphQLError with extensions.code | Plaid provides error_code, error_type structured fields |

**Key insight:** Plaid handles the hard parts (OAuth, MFA, institution changes, compliance). Don't rebuild what they provide. Focus on UX layer.

## Common Pitfalls

### Pitfall 1: Exposing Credentials Client-Side
**What goes wrong:** Developers accidentally expose access_token, client_id, or secret in frontend code or API responses
**Why it happens:** Confusion about which tokens are safe (link_token is safe, access_token is NOT)
**How to avoid:**
- Never include access_token in GraphQL responses to client
- Store access_token only in database, never in Redux/localStorage
- Use environment variables for client_id/secret, never hardcode
- Audit GraphQL types to ensure PlaidItem.accessToken is never exposed
**Warning signs:**
- access_token appears in browser Network tab
- Client code makes direct Plaid API calls
- Environment variables referenced in frontend code

### Pitfall 2: INVALID_LINK_TOKEN Errors
**What goes wrong:** Link fails with "Current version not supported" or INVALID_LINK_TOKEN error
**Why it happens:**
- Using public_key instead of link_token (deprecated Feb 2025)
- link_token expired (30-minute lifetime)
- Reusing same link_token across multiple users
**How to avoid:**
- Always create fresh link_token per user session
- Implement onExit handler to catch INVALID_LINK_TOKEN and refetch
- Never cache link_token beyond current session
**Warning signs:**
- "Current version not supported" message in Link
- Link exits immediately after opening
- Same link_token used in multiple places

### Pitfall 3: Incorrect OAuth redirect_uri
**What goes wrong:** OAuth-based banks (Chase, Bank of America, Capital One) fail during authentication
**Why it happens:** redirect_uri parameter missing or incorrect in /link/token/create call
**How to avoid:**
- Always set redirect_uri in link_token creation for web integrations
- Use exact URL (protocol, domain, path) matching your app
- Test with OAuth institutions in Sandbox (Chase, BoA)
**Warning signs:**
- Non-OAuth banks work, OAuth banks fail
- Error: "redirect_uri mismatch"
- User redirected to wrong URL after bank auth

### Pitfall 4: ITEM_LOGIN_REQUIRED Handling
**What goes wrong:** Users see stale data but no clear prompt to fix their connection
**Why it happens:** App doesn't listen to webhooks or doesn't implement Update mode UI
**How to avoid:**
- Implement ITEM: ERROR webhook handler that updates PlaidItem.status
- Show prominent re-auth UI when status is 'error'
- Use Update mode (link_token with access_token) for re-auth, NOT new Item
- After 2-3 failed re-auth attempts, suggest unlinking and reconnecting
**Warning signs:**
- API calls return ITEM_LOGIN_REQUIRED but UI unchanged
- User creates duplicate Items instead of re-authing
- No webhook endpoint implemented

### Pitfall 5: Credential Formatting Errors
**What goes wrong:** User enters correct credentials but gets INVALID_CREDENTIALS error
**Why it happens:** Extra spaces from autocomplete, case sensitivity, punctuation errors
**How to avoid:**
- Trim whitespace from username in any custom input (though Link handles this)
- Use Plaid Sandbox credentials exactly: `user_good` / `pass_good` (case-sensitive)
- Don't modify Link UI inputs, let Plaid handle validation
**Warning signs:**
- Sandbox test credentials fail
- "Invalid username or password" but credentials are correct
- Autocomplete adds trailing spaces

### Pitfall 6: Missing account_filters in Link Token
**What goes wrong:** User sees unsupported account types (e.g., mortgage shown for Transactions product)
**Why it happens:** Not specifying account_filters when creating link_token
**How to avoid:**
- For Transactions product, filter to depository (checking/savings) and credit accounts
- For Auth product, filter to depository only
- Set filters in /link/token/create based on products array
**Warning signs:**
- Investment accounts appear when only needing checking/savings
- User links unsupported account type, later gets errors fetching data

## Code Examples

Verified patterns from official sources:

### Complete Link Flow (Frontend)
```typescript
// Source: https://github.com/plaid/react-plaid-link
import { usePlaidLink } from 'react-plaid-link';
import { useMutation, useQuery } from '@apollo/client';
import { CREATE_LINK_TOKEN, EXCHANGE_PUBLIC_TOKEN } from '@/graphql/mutations/plaid';

const PlaidLinkButton = ({ mode = 'create' }) => {
  const { data } = useQuery(CREATE_LINK_TOKEN, {
    variables: { mode }, // 'create' or 'update'
  });

  const [exchangeToken] = useMutation(EXCHANGE_PUBLIC_TOKEN);

  const { open, ready } = usePlaidLink({
    token: data?.createLinkToken?.linkToken ?? null,
    onSuccess: async (public_token, metadata) => {
      if (mode === 'create') {
        // New Item: exchange public_token
        await exchangeToken({
          variables: {
            publicToken: public_token,
            metadata: {
              institutionId: metadata.institution?.institution_id,
              institutionName: metadata.institution?.name,
              accounts: metadata.accounts,
            }
          },
        });
      } else {
        // Update mode: no exchange, just update status
        // Handled by webhook or manual status update
      }
    },
    onExit: (error, metadata) => {
      if (error?.error_code === 'INVALID_LINK_TOKEN') {
        // Refetch link_token
        refetch();
      }
      // User cancelled - do nothing
    },
  });

  return (
    <button
      onClick={() => open()}
      disabled={!ready}
      className="btn-primary"
    >
      {mode === 'create' ? 'Connect Bank' : 'Re-authenticate'}
    </button>
  );
};
```

### Link Token Creation (Backend)
```typescript
// Source: https://plaid.com/docs/api/link/
import { PlaidApi } from 'plaid';

export const createLinkToken = async (
  userId: string,
  mode: 'create' | 'update',
  accessToken?: string
) => {
  const request: any = {
    user: { client_user_id: userId },
    client_name: 'SpendWise',
    products: ['transactions', 'auth', 'investments'],
    country_codes: ['US'],
    language: 'en',
    webhook: process.env.PLAID_WEBHOOK_URL,
    redirect_uri: process.env.PLAID_REDIRECT_URI, // Required for OAuth
  };

  if (mode === 'update' && accessToken) {
    request.access_token = accessToken; // Update mode
  } else {
    // Create mode: filter account types
    request.account_filters = {
      depository: {
        account_subtypes: ['checking', 'savings'],
      },
      credit: {
        account_subtypes: ['credit card'],
      },
      investment: {
        account_subtypes: ['401k', '403B', 'ira', 'roth', 'brokerage'],
      },
    };
  }

  const response = await plaidClient.linkTokenCreate(request);
  return response.data.link_token;
};
```

### Public Token Exchange (Backend)
```typescript
// Source: https://plaid.com/docs/quickstart/
export const exchangePublicToken = async (
  publicToken: string,
  userId: string,
  metadata: any
) => {
  // Exchange public_token for access_token
  const response = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });

  const { access_token, item_id } = response.data;

  // Fetch account details
  const accountsResponse = await plaidClient.accountsGet({
    access_token,
  });

  // Store PlaidItem and Accounts in database
  const plaidItem = await prisma.plaidItem.create({
    data: {
      userId,
      accessToken: access_token, // Encrypted by prisma-field-encryption
      plaidItemId: item_id,
      plaidInstitutionId: metadata.institutionId,
      institutionName: metadata.institutionName,
      status: 'active',
    },
  });

  // Create Account records
  for (const account of accountsResponse.data.accounts) {
    await prisma.account.create({
      data: {
        userId,
        plaidItemId: plaidItem.id,
        plaidAccountId: account.account_id,
        name: account.name,
        officialName: account.official_name,
        mask: account.mask,
        type: mapPlaidAccountType(account.type),
        balance: account.balances.current ?? 0,
        institution: metadata.institutionName,
        isLinked: true,
        lastSynced: new Date(),
      },
    });
  }

  return plaidItem;
};
```

### Webhook Handler (Backend)
```typescript
// Source: https://plaid.com/docs/api/webhooks/
import express from 'express';

router.post('/webhooks/plaid', express.raw({ type: 'application/json' }), async (req, res) => {
  const bodyString = req.body.toString('utf8');
  const headers = req.headers;

  // Verify webhook signature
  try {
    await verifyWebhook(bodyString, headers);
  } catch (error) {
    console.error('Webhook verification failed:', error);
    return res.status(401).send('Unauthorized');
  }

  const webhook = JSON.parse(bodyString);
  const { webhook_type, webhook_code, item_id } = webhook;

  // Process webhook
  if (webhook_type === 'ITEM') {
    if (webhook_code === 'ERROR') {
      const { error } = webhook;
      if (error.error_code === 'ITEM_LOGIN_REQUIRED') {
        // Update Item status to trigger re-auth UI
        await prisma.plaidItem.update({
          where: { plaidItemId: item_id },
          data: { status: 'error' },
        });
      }
    } else if (webhook_code === 'LOGIN_REPAIRED') {
      // Connection repaired automatically
      await prisma.plaidItem.update({
        where: { plaidItemId: item_id },
        data: { status: 'active' },
      });
    }
  }

  res.status(200).send('OK');
});
```

### Unlink Item (Backend)
```typescript
// Source: https://plaid.com/docs/api/items/
export const unlinkItem = async (
  itemId: string,
  keepAsManual: boolean
) => {
  const item = await prisma.plaidItem.findUnique({
    where: { id: itemId },
    include: { accounts: true },
  });

  // Revoke access_token with Plaid
  await plaidClient.itemRemove({
    access_token: item.accessToken,
  });

  if (keepAsManual) {
    // Convert accounts to manual
    await prisma.account.updateMany({
      where: { plaidItemId: itemId },
      data: {
        isLinked: false,
        plaidAccountId: null,
        plaidItemId: null,
      },
    });
  } else {
    // Delete all accounts from this Item
    await prisma.account.deleteMany({
      where: { plaidItemId: itemId },
    });
  }

  // Delete PlaidItem
  await prisma.plaidItem.delete({
    where: { id: itemId },
  });

  return {
    success: true,
    accountsAffected: item.accounts.length,
    keptAsManual: keepAsManual,
  };
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Public key authentication | link_token authentication | Feb 2025 deprecated | Must use /link/token/create, no more client-side public_key |
| /transactions/get | /transactions/sync | 2022 introduced | Cursor-based incremental updates, better performance |
| Manual duplicate handling | Plaid Reconcile service | Ongoing | Plaid marks transactions as new/update/deleted, but still imperfect |
| Institution screen scraping | OAuth + API partnerships | Ongoing migration | BoA migrating 2026, more institutions moving to OAuth |

**Deprecated/outdated:**
- **Public key integration**: No longer supported as of February 2025. Use link_token exclusively.
- **include_display_data parameter**: Undocumented, use include_optional_metadata for institution logos.
- **/item/access_token/invalidate**: Removed, use /item/remove instead.
- **@types/react-plaid-link package**: TypeScript types now built into react-plaid-link, don't install separately.

**Bank of America 2026 Migration:**
All pre-existing Bank of America Items using the old API will enter ITEM_LOGIN_REQUIRED state at migration deadline. Users must go through Update mode to move to new OAuth-based API. Access tokens remain valid, but Items need re-authentication.

## Open Questions

Things that couldn't be fully resolved:

1. **Plaid environment promotion strategy**
   - What we know: Three environments exist (Sandbox, Development, Production)
   - What's unclear: Best practice for testing Development environment with real bank accounts before production
   - Recommendation: Use Sandbox for all automated testing, manually test with Development accounts before launch, transition to Production only after Plaid approval

2. **Institution logo caching strategy**
   - What we know: Logos returned as base64 PNG from /institutions/get_by_id with include_optional_metadata
   - What's unclear: Whether to cache logos in database or fetch on-demand, logo update frequency
   - Recommendation: Cache logos in database with institution metadata, refresh weekly or on ITEM update

3. **Stale data presentation during connection errors**
   - What we know: When Item status is 'error', data is no longer syncing but historical data exists
   - What's unclear: User expectations - hide balances, show last-known with warning, or gray out completely
   - Recommendation (Claude's discretion): Show last-known balance with timestamp and prominent "Data not current - Re-authenticate" banner. Prevents user from seeing $0 balance shock while making staleness obvious.

4. **Manual account conversion on unlink**
   - What we know: User can choose to keep data as manual accounts or delete everything
   - What's unclear: Whether to keep transaction history when converting to manual, and how to handle ongoing transactions
   - Recommendation: Keep all historical transactions, mark account as manual, future transactions require manual entry. Preserves financial history for reports.

## Sources

### Primary (HIGH confidence)
- [Plaid Quickstart Documentation](https://plaid.com/docs/quickstart/) - Complete integration flow
- [Plaid Link Overview](https://plaid.com/docs/link/) - Link concepts and update mode
- [Plaid API - Items](https://plaid.com/docs/api/items/) - Item management and /item/remove
- [Plaid API - Webhooks](https://plaid.com/docs/api/webhooks/) - Webhook types and structure
- [Plaid Webhook Verification](https://plaid.com/docs/api/webhooks/webhook-verification/) - JWT verification process
- [Plaid Link Update Mode](https://plaid.com/docs/link/update-mode/) - Re-authentication flows
- [Plaid Errors - Item errors](https://plaid.com/docs/errors/item/) - ITEM_LOGIN_REQUIRED and error codes
- [Plaid API - Institutions](https://plaid.com/docs/api/institutions/) - Institution logos and metadata
- [Plaid API - Transactions](https://plaid.com/docs/api/products/transactions/) - /transactions/sync endpoint
- [Plaid API - Accounts](https://plaid.com/docs/api/accounts/) - Account types and subtypes
- [Plaid Sandbox - Test credentials](https://plaid.com/docs/sandbox/test-credentials/) - user_good/pass_good
- [Plaid Sandbox - Overview](https://plaid.com/docs/sandbox/) - Testing environment
- [GitHub - plaid/react-plaid-link](https://github.com/plaid/react-plaid-link) - Official React bindings
- [GitHub - plaid/plaid-node](https://github.com/plaid/plaid-node) - Official Node.js SDK
- [npm - react-plaid-link](https://www.npmjs.com/package/react-plaid-link) - Version 4.1.1
- [npm - plaid](https://www.npmjs.com/package/plaid) - Version 41.0.0

### Secondary (MEDIUM confidence)
- [Plaid Security Best Practices](https://plaid.com/core-exchange/docs/security/) - Token storage guidance
- [Plaid Launch Checklist](https://plaid.com/docs/launch-checklist/) - Production readiness
- [Plaid Link Best Practices](https://plaid.com/docs/link/best-practices/) - Optimizing conversion
- [Plaid Transactions Troubleshooting](https://plaid.com/docs/transactions/troubleshooting/) - Deduplication strategies
- [Plaid Link Troubleshooting](https://plaid.com/docs/link/troubleshooting/) - Common errors
- [Apollo Server Error Handling](https://www.apollographql.com/docs/apollo-server/data/errors) - GraphQL error patterns
- [GitGuardian - Plaid Access Token leaks](https://www.gitguardian.com/remediation/plaid-access-token) - Security risks
- [GitHub - plaid/pattern](https://github.com/plaid/pattern) - Reference implementation
- [Medium - Building React App with Plaid API](https://medium.com/@dereksams/building-a-react-app-with-the-plaid-api-93e45ae61b58) - Integration tutorial
- [Plaid Blog - Transaction Dupes](https://blog.plaid.com/distributed-duplicate-detective/) - Deduplication challenges

### Tertiary (LOW confidence)
- Various Stack Overflow threads - Integration questions (not authoritative, not cited directly)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official SDKs from Plaid, version numbers from npm
- Architecture: HIGH - Patterns from official Plaid quickstart and documentation
- Pitfalls: HIGH - Documented in Plaid troubleshooting guides and error documentation
- Code examples: HIGH - All examples from official Plaid docs or official GitHub repos

**Research date:** 2026-01-30
**Valid until:** 2026-02-28 (30 days - stable API, monthly SDK updates expected)
