# Phase 2: AI Categorization Enhancement - Research

**Researched:** 2026-02-01
**Domain:** LLM-powered transaction categorization, user feedback learning, confidence scoring
**Confidence:** HIGH

## Summary

This phase enhances the existing AI categorization system that is already substantially built. The codebase already contains: (1) an OpenAI gpt-4o-mini categorizer with batch processing and Redis caching (`src/lib/ai/categorizer.ts`), (2) a keyword-based fallback categorizer (`src/lib/parsers/categorizer.ts`), (3) a merchant name cleaner with known aliases and POS prefix stripping (`src/lib/parsers/merchant-cleaner.ts`), (4) a MerchantRule model and CRUD operations that learn from user corrections (`src/lib/merchant-rules.ts`), (5) Transaction model fields for `categoryConfidence` (Int) and `categorySource` (String), and (6) import preview UI that displays confidence scores, cleaned merchants, and allows category overrides.

The primary gaps against the requirements are: (a) the AI prompt does not include user transaction history for personalized categorization (CATG-03), (b) there is no dedicated "needs review" filter/page for low-confidence transactions (CATG-07), (c) the categorizer uses basic JSON mode instead of OpenAI Structured Outputs which guarantees schema adherence, (d) there is no mechanism to re-categorize existing transactions when new merchant rules are created, and (e) the frontend transaction list shows confidence indicators but has no dedicated review workflow.

**Primary recommendation:** This phase is primarily an enhancement and integration phase, not a greenfield build. Focus on upgrading the existing AI categorizer to use Structured Outputs, adding user history context to the prompt, building a "needs review" UI for low-confidence transactions, and implementing retroactive re-categorization when merchant rules change.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| openai | ^4.104.0 | OpenAI API client | Already in use for categorization |
| zod | ^3.22.4 | Schema validation | Already in frontend, needed for zodResponseFormat |
| ioredis | ^5.3.2 | Redis caching | Already in use for category cache |
| @prisma/client | ^5.10.0 | Database ORM | Already in use for MerchantRule, Transaction |

### Supporting (Need to Install in API)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | ^3.22.4 | Structured Outputs schemas | Backend needs zod for zodResponseFormat |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OpenAI gpt-4o-mini | Anthropic Claude Haiku | Would require new SDK; OpenAI already integrated |
| OpenAI Structured Outputs | JSON mode (current) | Structured Outputs guarantees schema compliance; JSON mode does not |
| OpenAI gpt-4o-mini | GPT-5 Nano ($0.05/M input) | May be available; gpt-4o-mini is proven and cheap enough at $0.15/M input |

**Installation (API only):**
```bash
cd spendwise-api
npm install zod
```

Note: `openai` package is already at ^4.104.0 which supports Structured Outputs. The `zod` package is already in the frontend but needs to be added to the API for `zodResponseFormat`.

## Architecture Patterns

### Existing Project Structure (Relevant Files)
```
spendwise-api/src/
├── lib/
│   ├── ai/
│   │   ├── categorizer.ts          # OpenAI categorizer (ENHANCE)
│   │   └── index.ts                # Exports
│   ├── parsers/
│   │   ├── categorizer.ts          # Keyword fallback (KEEP)
│   │   ├── merchant-cleaner.ts     # Merchant name cleaning (ENHANCE)
│   │   ├── import-processor.ts     # Statement import flow (KEEP)
│   │   └── types.ts                # ParsedTransaction, PreviewTransaction (KEEP)
│   └── merchant-rules.ts           # MerchantRule CRUD (ENHANCE)
├── schema/
│   ├── resolvers/
│   │   ├── transaction.ts          # Transaction CRUD + merchant rules (ENHANCE)
│   │   └── statementImport.ts      # Import confirmation (KEEP)
│   └── typeDefs/
│       ├── transaction.ts          # Transaction GQL types (ENHANCE)
│       └── statementImport.ts      # Import GQL types (KEEP)

spendwise/src/
├── components/
│   ├── transactions/
│   │   ├── TransactionList.tsx      # Transaction table (ENHANCE)
│   │   ├── TransactionItem.tsx      # Row with confidence indicator (ENHANCE)
│   │   └── TransactionFilters.tsx   # Filter bar (ENHANCE)
│   └── import/
│       └── ImportPreview.tsx         # Import preview with overrides (KEEP)
├── hooks/
│   └── useTransactions.ts           # Transaction hooks (ENHANCE)
├── graphql/
│   ├── queries/transactions.ts      # Transaction queries (ENHANCE)
│   └── fragments/index.ts           # TransactionFields fragment (KEEP)
└── types/index.ts                   # Transaction type (KEEP)
```

### Pattern 1: Structured Outputs with Zod (Upgrade from JSON Mode)
**What:** Replace `response_format: { type: 'json_object' }` with `zodResponseFormat` for guaranteed schema compliance
**When to use:** All AI categorization calls
**Example:**
```typescript
// Source: https://github.com/openai/openai-node/blob/master/helpers.md
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const CategoryResult = z.object({
  results: z.array(z.object({
    index: z.number().describe('The transaction index from the input'),
    category: z.enum([
      'Food & Dining', 'Groceries', 'Shopping', 'Transportation',
      'Bills & Utilities', 'Entertainment', 'Healthcare', 'Travel',
      'Education', 'Personal Care', 'Income', 'Transfer', 'Other',
    ]).describe('The transaction category'),
    confidence: z.number().min(0).max(100).describe('Confidence score 0-100'),
    cleanedMerchant: z.string().describe('Clean, readable merchant name'),
  })),
});

const completion = await openai.chat.completions.parse({
  model: 'gpt-4o-mini',
  temperature: 0.1,
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ],
  response_format: zodResponseFormat(CategoryResult, 'categorization'),
});

const parsed = completion.choices[0]?.message?.parsed;
// parsed is fully typed: { results: Array<{ index: number, category: string, ... }> }
```

### Pattern 2: User History Context in Prompt
**What:** Include the user's past categorization patterns in the system prompt to personalize
**When to use:** During AI categorization when the user has transaction history
**Example:**
```typescript
// Fetch user's recent category patterns
const recentPatterns = await prisma.transaction.groupBy({
  by: ['merchant', 'category'],
  where: {
    userId,
    categorySource: { in: ['manual', 'rule'] },
    merchant: { not: null },
  },
  _count: { id: true },
  orderBy: { _count: { id: 'desc' } },
  take: 50,
});

// Build context string
const userContext = recentPatterns
  .map(p => `${p.merchant} -> ${p.category} (${p._count.id}x)`)
  .join('\n');

const systemPrompt = `You are a financial transaction categorizer.
Categories: ${VALID_CATEGORIES.join(', ')}

This user has previously categorized these merchants:
${userContext}

Use these as strong signals. Match similar merchants to the same categories.`;
```

### Pattern 3: Retroactive Re-categorization
**What:** When a merchant rule is created/updated, apply it to existing transactions with the same merchant
**When to use:** After user corrects a category (creating a merchant rule)
**Example:**
```typescript
// In createOrUpdateMerchantRule, after upserting the rule:
const { normalizedKey } = cleanMerchantName(rawMerchant);

// Update all transactions from this user with matching merchant
// that were NOT manually categorized
await prisma.transaction.updateMany({
  where: {
    userId,
    merchant: { contains: normalizedKey, mode: 'insensitive' },
    categorySource: { not: 'manual' },
  },
  data: {
    category: newCategory,
    categorySource: 'rule',
    categoryConfidence: 100,
  },
});
```

### Pattern 4: Low-Confidence Transaction Filter
**What:** GraphQL query filter for transactions needing review
**When to use:** Dedicated "needs review" page/section
**Example:**
```graphql
# Add to TransactionFilterInput
input TransactionFilterInput {
  # ... existing fields
  needsReview: Boolean  # When true, filters to low-confidence non-manual
}
```
```typescript
// In resolver, when needsReview is true:
if (args.filters?.needsReview) {
  where.categoryConfidence = { lt: 70 };
  where.categorySource = { notIn: ['manual', 'rule'] };
}
```

### Anti-Patterns to Avoid
- **Calling OpenAI per-transaction:** Always batch. The existing BATCH_SIZE of 50 is good. Token costs are negligible, but API latency per call adds up.
- **Re-categorizing manually-set transactions:** Never override `categorySource: 'manual'` automatically. User intent is sacred.
- **Storing full AI response in DB:** Only store category, confidence, source, and cleanedMerchant. The raw AI response is ephemeral.
- **Blocking import on AI failure:** The existing pattern of falling back to keyword categorization on AI error is correct. Never fail an import because AI is unavailable.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON schema enforcement | Manual JSON.parse + validation | OpenAI Structured Outputs with zodResponseFormat | Guaranteed schema compliance at the model level; eliminates parsing errors |
| Merchant name normalization | Regex-only approach | Extend existing merchant-cleaner.ts + AI-generated cleanedMerchant | The AI sees patterns humans miss (international merchants, encoded names) |
| Category validation | String comparison | Zod enum with VALID_CATEGORIES | Single source of truth, compile-time safety, used by both API validation and AI schema |
| Re-categorization job | Custom queue system | Inline async operation in mutation resolver | For user-initiated actions affecting ~100s of transactions, inline Prisma updateMany is fast enough. No queue needed. |

**Key insight:** The codebase already has 80% of the infrastructure. This phase is about making it smarter (user history context, structured outputs) and more usable (review UI, retroactive rules), not about building new infrastructure.

## Common Pitfalls

### Pitfall 1: Prompt Token Bloat from User History
**What goes wrong:** Including too much user history in the system prompt causes token costs to balloon and may exceed context window
**Why it happens:** Users with thousands of transactions have many unique merchant patterns
**How to avoid:** Limit user history context to top 50 most frequently manually-corrected merchant-category pairs. Use `groupBy` with `take: 50` and prioritize `categorySource: 'manual'` or `'rule'` entries.
**Warning signs:** API calls taking >3s, token usage per batch >10K

### Pitfall 2: Re-categorization Loop
**What goes wrong:** Updating transactions triggers more rule creation, which triggers more updates
**Why it happens:** If transaction update events cascade into merchant rule updates
**How to avoid:** Only create merchant rules from explicit user actions (manual category override), never from automated re-categorization. The `categorySource` field is the guard: only `categorySource: 'manual'` should trigger rule creation.
**Warning signs:** Unexpected transaction updates appearing in audit logs

### Pitfall 3: Stale Redis Cache After Rule Change
**What goes wrong:** User corrects a category, but cached AI results still return the old category for that merchant
**Why it happens:** Redis cache key is `merchant:cat:{normalizedKey}` with 30-day TTL
**How to avoid:** The existing code already invalidates the cache key in `createOrUpdateMerchantRule`. Verify this works for the normalizedKey format. Ensure the fingerprint generation matches.
**Warning signs:** New imports showing old categories for corrected merchants

### Pitfall 4: Structured Outputs Refusal
**What goes wrong:** The model refuses to categorize (returns a refusal instead of structured data)
**Why it happens:** Content moderation or edge cases in transaction descriptions
**How to avoid:** Always check `completion.choices[0]?.message?.refusal` before accessing `.parsed`. Fall back to keyword categorization on refusal.
**Warning signs:** Null parsed responses

### Pitfall 5: Category Enum Mismatch
**What goes wrong:** Categories defined in multiple places get out of sync (AI prompt, frontend dropdown, Zod schema, keyword categorizer)
**Why it happens:** Category list is duplicated in: `ai/categorizer.ts`, `parsers/categorizer.ts`, `ImportPreview.tsx`, `transactions/page.tsx`
**How to avoid:** Define VALID_CATEGORIES in a single shared constants file. Import it everywhere. The Zod schema for Structured Outputs should reference this same list.
**Warning signs:** "Other" category appearing more than expected, category dropdown missing options

### Pitfall 6: Overwriting Cleaned Merchant on Update
**What goes wrong:** When a user edits a transaction, the cleaned merchant name gets lost
**Why it happens:** The `merchant` field in the DB stores the cleaned name from import, but manual edits might set it to something else
**How to avoid:** The current flow already stores `cleanedMerchant` as the `merchant` field during import. On user edit, the merchant field should remain user-controlled. No special handling needed.
**Warning signs:** Transaction merchant names reverting to raw bank descriptions

## Code Examples

Verified patterns from the existing codebase and official sources:

### Current AI Categorization Flow (Existing - in categorizer.ts)
```typescript
// Source: /Users/heechung/projects/spendwise-api/src/lib/ai/categorizer.ts
// Current flow: merchant rules -> Redis cache -> OpenAI -> keyword fallback
// Each step fills in gaps from the previous step
// Results include: category, confidence (0-100), source, cleanedMerchant
```

### Current Merchant Rule Learning (Existing - in transaction.ts)
```typescript
// Source: /Users/heechung/projects/spendwise-api/src/schema/resolvers/transaction.ts
// When category changes on updateTransaction:
if (input.category && input.category !== existing.category) {
  updateData.categorySource = 'manual';
  updateData.categoryConfidence = 100;
  // Saves merchant rule for future categorization
  if (merchant) {
    await createOrUpdateMerchantRule(context.prisma, user.id, merchant, input.category);
  }
}
```

### Upgrade to Structured Outputs (New)
```typescript
// Source: https://github.com/openai/openai-node/blob/master/helpers.md
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { VALID_CATEGORIES } from '../constants';

// Define the Zod schema with enum constraint
const CategorizedResult = z.object({
  results: z.array(z.object({
    index: z.number(),
    category: z.enum(VALID_CATEGORIES as [string, ...string[]]),
    confidence: z.number().min(0).max(100),
    cleanedMerchant: z.string(),
  })),
});

// Use .parse() instead of .create() for auto-parsing
const completion = await openai.chat.completions.parse({
  model: 'gpt-4o-mini',
  temperature: 0.1,
  messages: [systemMessage, userMessage],
  response_format: zodResponseFormat(CategorizedResult, 'categorization'),
});

const result = completion.choices[0]?.message;
if (result?.refusal) {
  // Handle refusal - fall back to keyword categorization
  console.warn('AI refused to categorize:', result.refusal);
  return null;
}
// result.parsed is fully typed and guaranteed to match schema
return result?.parsed;
```

### Needs Review Query (New)
```typescript
// New query for low-confidence transactions
transactionsNeedingReview: async (_: unknown, { limit = 20 }: { limit?: number }, context: Context) => {
  const user = requireAuth(context);
  return context.prisma.transaction.findMany({
    where: {
      userId: user.id,
      categoryConfidence: { lt: 70 },
      categorySource: { notIn: ['manual', 'rule'] },
    },
    orderBy: { date: 'desc' },
    take: limit,
    include: { account: true },
  });
},
```

### Retroactive Rule Application (New)
```typescript
// After creating/updating a merchant rule, apply to existing transactions
export async function applyMerchantRuleRetroactively(
  prisma: any,
  userId: string,
  merchantPattern: string,
  category: string,
  merchantDisplay: string
) {
  // Find transactions with matching merchant that aren't manually categorized
  const updated = await prisma.transaction.updateMany({
    where: {
      userId,
      categorySource: { notIn: ['manual'] },
      OR: [
        { merchant: { contains: merchantPattern, mode: 'insensitive' } },
      ],
    },
    data: {
      category,
      categorySource: 'rule',
      categoryConfidence: 100,
      merchant: merchantDisplay, // Update to clean display name
    },
  });
  return updated.count;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JSON mode (`response_format: { type: 'json_object' }`) | Structured Outputs (`response_format: zodResponseFormat(schema)`) | Aug 2024 (OpenAI) | Guaranteed schema compliance, eliminates JSON parse errors |
| `client.chat.completions.create()` | `client.chat.completions.parse()` | Aug 2024 (openai SDK) | Auto-parsing with Zod, typed responses |
| Per-transaction API calls | Batch categorization (50 per call) | Already implemented | Token-efficient, lower latency |
| Static keyword matching only | AI + keyword fallback chain | Already implemented | Better accuracy with graceful degradation |

**Note on newer API:** OpenAI has a newer Responses API (`openai.responses.parse()` with `zodTextFormat`) but the existing Chat Completions API (`openai.chat.completions.parse()` with `zodResponseFormat`) is fully supported and does not require migration. The Chat Completions API is the right choice here.

**Deprecated/outdated:**
- `response_format: { type: 'json_object' }`: Still works but Structured Outputs is strictly better for typed schemas
- `client.beta.chat.completions.parse()`: The `.beta` prefix was removed; use `client.chat.completions.parse()` directly (verify in installed version)

## Existing Code Gap Analysis

What exists vs. what each requirement needs:

| Requirement | What Exists | Gap | Effort |
|-------------|-------------|-----|--------|
| CATG-01: Auto-categorize with AI | Full AI categorizer with OpenAI | Upgrade to Structured Outputs | Small |
| CATG-02: Use existing categorizer as baseline | Keyword categorizer is the fallback | Already works (renamed from "Plaid categories") | None |
| CATG-03: AI uses merchant + amount + user history | Uses merchant + amount + type | Add user history context to prompt | Medium |
| CATG-04: Manual category override | updateTransaction creates merchant rule | Works but needs dedicated review UI | Small (mostly frontend) |
| CATG-05: AI learns from corrections | MerchantRule model, rule lookup in categorizer | Need retroactive re-categorization | Medium |
| CATG-06: Confidence scores | categoryConfidence field exists, AI returns scores | Works, refine thresholds | Small |
| CATG-07: Low-confidence flagging | Import preview shows confidence, TransactionItem shows amber dot | Need dedicated "needs review" query + UI | Medium |
| CATG-08: Merchant name cleaning | merchant-cleaner.ts with aliases + POS stripping | Expand known aliases, AI also cleans | Small |

## Open Questions

Things that could not be fully resolved:

1. **Confidence threshold for "needs review"**
   - What we know: Import preview uses <60 as low confidence. TransactionItem shows amber dot at <70 for AI source.
   - What's unclear: What's the right threshold for the dedicated "needs review" feature?
   - Recommendation: Use 70 as the threshold. Transactions below 70% confidence from AI/keyword/cache sources (but not manual/rule) should appear in review.

2. **Whether to use `client.chat.completions.parse()` or `client.beta.chat.completions.parse()`**
   - What we know: The OpenAI SDK initially shipped Structured Outputs under `client.beta.chat.completions.parse()`. Later versions moved it to `client.chat.completions.parse()`.
   - What's unclear: Which version the installed `openai@^4.104.0` uses.
   - Recommendation: Check at implementation time. Try non-beta first; if unavailable, use beta. Both have the same API surface.

3. **Cost impact of adding user history to the prompt**
   - What we know: gpt-4o-mini costs $0.15/M input tokens. Adding 50 merchant-category pairs (~500 tokens) to each batch call is minimal.
   - What's unclear: Exact token counts per batch with history context.
   - Recommendation: Monitor token usage after enabling. The cost increase should be negligible (<$0.01 per import batch).

4. **Whether to re-categorize retroactively on rule creation**
   - What we know: Retroactive re-categorization would update existing transactions automatically when a user corrects a category. This is powerful but could be surprising.
   - What's unclear: Whether users expect existing transactions to change when they correct one.
   - Recommendation: Enable retroactive re-categorization by default with a count indicator ("This will also update 12 similar transactions"). This matches the intent of CATG-05.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `/Users/heechung/projects/spendwise-api/src/lib/ai/categorizer.ts` - Full AI categorizer implementation
- Codebase analysis: `/Users/heechung/projects/spendwise-api/src/lib/merchant-rules.ts` - Merchant rule CRUD
- Codebase analysis: `/Users/heechung/projects/spendwise-api/src/lib/parsers/merchant-cleaner.ts` - Merchant name cleaning
- Codebase analysis: `/Users/heechung/projects/spendwise-api/src/schema/resolvers/transaction.ts` - Transaction CRUD with rule learning
- Codebase analysis: `/Users/heechung/projects/spendwise-api/prisma/schema.prisma` - Full database schema
- [OpenAI Structured Outputs Guide](https://platform.openai.com/docs/guides/structured-outputs) - Official documentation
- [openai-node helpers.md](https://github.com/openai/openai-node/blob/master/helpers.md) - Zod integration examples

### Secondary (MEDIUM confidence)
- [OpenAI API Pricing](https://openai.com/api/pricing/) - gpt-4o-mini at $0.15/M input, $0.60/M output
- [zodResponseFormat tutorial](https://hooshmand.net/zod-zodresponseformat-structured-outputs-openai/) - Verified Node.js patterns
- [Crypto.com LLM classification optimization](https://aws.amazon.com/blogs/machine-learning/optimizing-enterprise-ai-assistants-how-crypto-com-uses-llm-reasoning-and-feedback-for-enhanced-efficiency/) - Iterative prompt refinement achieving 94% accuracy

### Tertiary (LOW confidence)
- [GPT-4o-mini pricing 2026](https://pricepertoken.com/pricing-page/model/openai-gpt-4o-mini) - Third-party pricing aggregator
- [OpenAI pricing in 2026](https://www.finout.io/blog/openai-pricing-in-2026) - Cost optimization strategies

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing OpenAI + Prisma + Redis stack; only adding zod to API
- Architecture: HIGH - Enhancing existing patterns, not building new infrastructure; codebase analyzed thoroughly
- Pitfalls: HIGH - Identified from direct codebase analysis (e.g., duplicate VALID_CATEGORIES, cache invalidation patterns)
- Code examples: HIGH - Based on existing codebase patterns and verified OpenAI SDK documentation

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - stable domain, no fast-moving dependencies)
