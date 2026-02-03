# Phase 7: Financial Planning - Research

**Researched:** 2026-02-02
**Domain:** AI-powered conversational financial planning chat
**Confidence:** HIGH

## Summary

Phase 7 implements AI-powered personalized financial insights and recommendations through a conversational chat interface using the Anthropic Claude API. The phase leverages existing data from all prior phases (transactions, recurring patterns, net worth, portfolio) to generate pre-loaded insights and support interactive follow-up conversations. The system enhances the existing SavingsGoal model with AI-powered parsing and tracking rather than replacing it.

The technical implementation centers on four core domains: (1) streaming chat with Anthropic Claude API using Server-Sent Events, (2) financial data summarization and prompt engineering to control token costs, (3) chat message persistence with conversation context, and (4) real-time UI updates with thinking indicators and inline visualizations. The existing tech stack (GraphQL + Apollo Server, Prisma, Redis, React + Apollo Client) supports all requirements with targeted additions.

Key architectural decisions include using Claude Sonnet 4.5 ($3 input / $15 output per MTok) with prompt caching for 90% cost savings on repeated context, storing chat messages in PostgreSQL with relationship to user sessions, implementing Server-Sent Events through GraphQL subscriptions or HTTP endpoints, and rendering streaming responses with React component libraries like assistant-ui or custom implementations.

**Primary recommendation:** Use @anthropic-ai/sdk with streaming support, implement financial summary generation to optimize token usage, persist chat messages in a dedicated ChatMessage table with conversational threading, and leverage assistant-ui or shadcn/ui AI components for chat interface with streaming and thinking indicators.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | ^0.38+ | Anthropic Claude API client with streaming | Official TypeScript SDK, handles SSE streaming, tool use, message accumulation |
| @assistant-ui/react | ^0.5+ | Conversational AI chat UI components | Purpose-built for AI chat, streaming support, accessibility, Radix UI primitives, 200K+ downloads/month |
| graphql-subscriptions | ^2.0+ | GraphQL real-time subscriptions | Standard for Apollo Server real-time updates, supports SSE transport |
| zod | ^3.22+ (existing) | Schema validation and structured outputs | Already in stack, used for AI response parsing and validation |
| recharts | ^2.12+ (existing) | Chart components for inline visualizations | Already in stack, declarative React charts for embedding in chat responses |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| graphql-sse | ^2.5+ | GraphQL over Server-Sent Events | If implementing streaming via GraphQL subscriptions instead of REST endpoint |
| @stream-io/chat-react-ai | ^1.0+ | Stream Chat AI components | Alternative to assistant-ui, includes thinking indicators and AI state management |
| react-markdown | ^9.0+ | Markdown rendering in chat | For rendering Claude's markdown-formatted responses with formatting, lists, links |
| react-syntax-highlighter | ^15.5+ | Code syntax highlighting | If chat responses include code snippets or technical examples |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @assistant-ui/react | Custom chat UI | assistant-ui provides battle-tested streaming, accessibility, thinking indicators out-of-box vs custom requires more dev time |
| Anthropic Claude API | OpenAI GPT-4 API | Claude Sonnet 4.5 ($3/$15) cheaper than GPT-4 ($30/$60), extended context (200K standard, 1M beta), better financial reasoning per CONTEXT.md decision |
| GraphQL subscriptions | WebSockets (Socket.io) | GraphQL subscriptions leverage existing Apollo infrastructure vs WebSockets require separate server setup |
| Server-Sent Events | Long polling | SSE is standard for streaming, firewall-proof, HTTP/2 multiplexing vs polling has higher latency and overhead |

**Installation:**
```bash
# Backend (spendwise-api)
npm install @anthropic-ai/sdk graphql-subscriptions

# Frontend (spendwise)
npm install @assistant-ui/react react-markdown
```

## Architecture Patterns

### Recommended Project Structure

```
spendwise-api/src/
├── schema/
│   ├── typeDefs/
│   │   └── financialPlanning.ts     # GraphQL types for chat, insights, goals
│   └── resolvers/
│       └── financialPlanning.ts     # Chat, insights, goal parsing resolvers
├── services/
│   └── financialPlanning/
│       ├── claude-client.ts          # Anthropic SDK wrapper
│       ├── insight-generator.ts      # Pre-generate insights from financial data
│       ├── financial-summarizer.ts   # Build compact financial summary for prompts
│       ├── goal-parser.ts            # Extract goal details from freeform text
│       └── prompt-templates.ts       # System prompts for different insight types
└── lib/
    └── anthropic.ts                  # Shared Anthropic client configuration

spendwise/src/
├── hooks/
│   └── useFinancialPlanning.ts      # Apollo hooks for chat, insights, goals
├── components/
│   └── planning/
│       ├── ChatInterface.tsx         # Main chat container with message list
│       ├── ChatMessage.tsx           # Individual message bubble (user/assistant)
│       ├── StreamingMessage.tsx      # Streaming text with thinking indicator
│       ├── ChatInput.tsx             # Message input with rate limit display
│       ├── InsightCard.tsx           # Pre-generated insight display
│       ├── InlineChart.tsx           # Recharts wrapper for chat visualizations
│       └── GoalSuggestion.tsx        # AI-suggested goal with quick-create action
└── app/(dashboard)/planning/
    └── page.tsx                      # Planning page with insights + chat
```

### Pattern 1: Financial Data Summarization for Token Efficiency

**What:** Build compact financial summaries that include totals, trends, top merchants, recurring patterns, net worth trajectory, and portfolio allocation - pass to Claude as context instead of raw transactions.

**When to use:** Every chat message request to give Claude full financial picture without exceeding token budgets or triggering high costs.

**Example:**
```typescript
// Source: Research findings on token optimization
// spendwise-api/src/services/financialPlanning/financial-summarizer.ts

interface FinancialSummary {
  period: string; // "Last 6 months"
  totals: {
    income: number;
    expenses: number;
    netCashFlow: number;
  };
  trends: {
    monthlyIncome: { month: string; amount: number }[];
    monthlyExpenses: { month: string; amount: number }[];
  };
  topMerchants: { name: string; total: number; category: string }[];
  recurringTransactions: {
    active: { merchant: string; frequency: string; amount: number }[];
    possiblyCancelled: { merchant: string; lastDate: string; amount: number }[];
  };
  netWorth: {
    current: number;
    change6m: number;
    trend: "increasing" | "decreasing" | "stable";
  };
  portfolio?: {
    totalValue: number;
    allocation: { type: string; percentage: number }[];
    topHoldings: { symbol: string; value: number }[];
  };
  goals: {
    active: { name: string; target: number; current: number; deadline: string }[];
    nearingCompletion: string[]; // goal names > 80% complete
  };
}

export async function buildFinancialSummary(
  prisma: PrismaClient,
  userId: string
): Promise<FinancialSummary> {
  const sixMonthsAgo = subMonths(new Date(), 6);

  // Parallel queries for efficiency
  const [transactions, recurringData, netWorthData, portfolio, goals] =
    await Promise.all([
      prisma.transaction.findMany({
        where: { userId, date: { gte: sixMonthsAgo } },
        select: { amount: true, type: true, category: true, merchant: true, date: true },
      }),
      prisma.recurringTransaction.findMany({
        where: { userId },
        select: { merchantName: true, frequency: true, averageAmount: true, status: true, lastDate: true },
      }),
      // ... similar for net worth snapshots, portfolio, goals
    ]);

  // Aggregate and compress - return ~1-2K tokens instead of 50K+ raw data
  return {
    period: "Last 6 months",
    totals: calculateTotals(transactions),
    trends: buildMonthlyTrends(transactions),
    topMerchants: getTopMerchants(transactions, 10),
    recurringTransactions: {
      active: recurringData.filter(r => r.status === 'ACTIVE').slice(0, 5),
      possiblyCancelled: recurringData.filter(r => r.status === 'POSSIBLY_CANCELLED').slice(0, 3),
    },
    // ... compress remaining data
  };
}
```

### Pattern 2: Streaming Chat with Server-Sent Events

**What:** Use Anthropic SDK's streaming interface to emit token-by-token responses via Server-Sent Events, accumulate in backend, and forward to frontend via GraphQL subscription or HTTP SSE endpoint.

**When to use:** For all chat interactions to provide responsive "typing" feel and prevent timeout issues with long responses.

**Example:**
```typescript
// Source: https://platform.claude.com/docs/en/api/streaming
// spendwise-api/src/services/financialPlanning/claude-client.ts

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function* streamChatResponse(
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  financialSummary: FinancialSummary,
  userMessage: string
): AsyncGenerator<string> {
  const systemPrompt = `You are a friendly financial advisor helping users understand their finances and reach their goals.

Current Financial Summary:
${JSON.stringify(financialSummary, null, 2)}

Guidelines:
- Use conversational, warm tone (not robotic)
- Reference specific data from the summary when relevant
- Provide actionable recommendations
- Include benchmark comparisons (user's average vs financial norms)
- Celebrate progress and improvements
- For spending anomalies, explain what happened, why it matters, what to do

IMPORTANT: Every response must end with the disclaimer:
"📌 Not professional financial advice. Consult a licensed advisor for personalized guidance."`;

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ],
  });

  // Yield tokens as they arrive
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      yield chunk.delta.text;
    }
  }
}
```

### Pattern 3: Chat Message Persistence with Threading

**What:** Store chat messages in a dedicated table with relationship to user and optional session/thread grouping, enabling conversation history across page loads.

**When to use:** For all chat interactions to support "AI remembers previous conversations" requirement.

**Example:**
```prisma
// Source: Research on chat message persistence schemas
// spendwise-api/prisma/schema.prisma

model ChatSession {
  id        String        @id @default(cuid())
  userId    String
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String?       // Auto-generated from first message or user-set
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  messages  ChatMessage[]

  @@index([userId, updatedAt])
}

model ChatMessage {
  id        String      @id @default(cuid())
  sessionId String
  session   ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  role      String      // "user" or "assistant"
  content   String      @db.Text
  metadata  Json?       // { tokens: number, model: string, thinking?: string }
  createdAt DateTime    @default(now())

  @@index([sessionId, createdAt])
}

model InsightCache {
  id               String   @id @default(cuid())
  userId           String
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  insightType      String   // "spending_anomaly", "savings_opportunity", "investment_observation"
  title            String
  content          String   @db.Text
  priority         Int      // 1 (highest impact) to N
  dataSnapshot     Json     // Financial summary used to generate this insight
  generatedAt      DateTime @default(now())
  invalidatedAt    DateTime? // Set when new statement imported

  @@unique([userId, insightType, generatedAt])
  @@index([userId, invalidatedAt])
}
```

### Pattern 4: Rate Limiting with Redis

**What:** Track daily message count per user in Redis with TTL expiration, decrement remaining count on each message, block new messages when limit reached.

**When to use:** For controlling LLM API costs via 20-30 daily message limit per user.

**Example:**
```typescript
// Source: https://redis.io/glossary/rate-limiting/
// spendwise-api/src/services/financialPlanning/rate-limiter.ts

import { redis } from '../../lib/redis';

const DAILY_MESSAGE_LIMIT = 25; // Within 20-30 range from CONTEXT.md

export async function checkRateLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}> {
  const key = `rate_limit:chat:${userId}`;
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); // Next midnight
  const ttl = Math.floor((midnight.getTime() - now.getTime()) / 1000);

  const count = await redis.get(key);
  const used = count ? parseInt(count, 10) : 0;

  if (used >= DAILY_MESSAGE_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: midnight,
    };
  }

  return {
    allowed: true,
    remaining: DAILY_MESSAGE_LIMIT - used,
    resetAt: midnight,
  };
}

export async function incrementUsage(userId: string): Promise<void> {
  const key = `rate_limit:chat:${userId}`;
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const ttl = Math.floor((midnight.getTime() - now.getTime()) / 1000);

  const current = await redis.incr(key);
  if (current === 1) {
    // First message of the day, set expiration
    await redis.expire(key, ttl);
  }
}
```

### Pattern 5: React Streaming UI with assistant-ui

**What:** Use assistant-ui's composable React components to render streaming messages with thinking indicators, auto-scrolling, and markdown support.

**When to use:** For frontend chat interface to get production-ready streaming UX without custom implementation.

**Example:**
```typescript
// Source: https://github.com/assistant-ui/assistant-ui
// spendwise/src/components/planning/ChatInterface.tsx

'use client';

import { useAssistant } from '@assistant-ui/react';
import { AssistantMessage, Thread } from '@assistant-ui/react';
import { useEffect, useState } from 'react';
import { useMutation, useSubscription } from '@apollo/client';
import { SEND_CHAT_MESSAGE, SUBSCRIBE_TO_CHAT } from '@/graphql';

export function ChatInterface({ sessionId }: { sessionId: string }) {
  const [message, setMessage] = useState('');
  const [sendMessage, { loading }] = useMutation(SEND_CHAT_MESSAGE);

  const { data: streamData } = useSubscription(SUBSCRIBE_TO_CHAT, {
    variables: { sessionId },
  });

  const handleSend = async () => {
    if (!message.trim() || loading) return;

    await sendMessage({
      variables: { sessionId, content: message },
    });

    setMessage('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Thread renders message history with auto-scroll */}
      <Thread className="flex-1 overflow-y-auto p-4">
        {/* Messages rendered with streaming support */}
      </Thread>

      {/* Thinking indicator */}
      {streamData?.chatStream?.isThinking && (
        <div className="px-4 py-2 text-sm text-gray-500 animate-pulse">
          💭 Analyzing your finances...
        </div>
      )}

      {/* Input area */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your finances or set a goal..."
            className="flex-1 px-4 py-2 border rounded-lg"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !message.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Pattern 6: Freeform Goal Parsing with Structured Outputs

**What:** Use Claude with structured outputs (similar to OpenAI's zodResponseFormat) to extract goal details from natural language input.

**When to use:** When user creates goals via chat instead of form ("I want to save $5K for vacation by June").

**Example:**
```typescript
// Source: Anthropic structured outputs + OpenAI pattern from existing categorizer.ts
// spendwise-api/src/services/financialPlanning/goal-parser.ts

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const GoalSchema = z.object({
  name: z.string().describe('Goal name/purpose'),
  targetAmount: z.number().describe('Target amount in dollars'),
  deadline: z.string().optional().describe('ISO date string if mentioned'),
  category: z.enum(['vacation', 'emergency_fund', 'home', 'debt_payoff', 'other']),
  confidence: z.number().min(0).max(100).describe('Confidence in extraction accuracy'),
});

export async function parseGoalFromText(
  userInput: string,
  conversationContext?: string[]
): Promise<z.infer<typeof GoalSchema> | null> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    temperature: 0.1,
    messages: [
      {
        role: 'user',
        content: `Extract savings goal details from this user input:
"${userInput}"

${conversationContext ? `Previous context:\n${conversationContext.join('\n')}` : ''}

Return JSON matching this schema:
{
  "name": "string",
  "targetAmount": number,
  "deadline": "YYYY-MM-DD or null",
  "category": "vacation|emergency_fund|home|debt_payoff|other",
  "confidence": 0-100
}

If no clear goal mentioned, return null.`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') return null;

  try {
    const parsed = JSON.parse(content.text);
    return GoalSchema.parse(parsed);
  } catch {
    return null;
  }
}
```

### Anti-Patterns to Avoid

- **Sending raw transaction arrays to Claude:** Results in 50K+ token prompts, high costs, exceeds context limits. Use financial summary instead.
- **Blocking chat UI during streaming:** Users should see tokens appearing in real-time. Implement SSE or subscriptions, not polling.
- **Storing conversation history in session/memory only:** Loses chat history on page refresh. Persist messages in database.
- **No rate limiting:** Uncontrolled user chats can rack up $100+ in API costs per user per day. Implement Redis-based daily limits.
- **Missing disclaimers on AI advice:** Legal/compliance risk. Append disclaimer to every assistant message automatically.
- **Truncating context without strategy:** Naive "keep last 10 messages" loses important financial context. Use summarization or priority-based truncation.
- **No error handling on streaming failures:** Network drops cause blank responses. Implement graceful degradation with retry and partial response recovery.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Streaming chat UI | Custom SSE handler + message bubbles + auto-scroll + thinking indicators | @assistant-ui/react or @stream-io/chat-react-ai | Chat UI is deceptively complex - streaming state management, accessibility, markdown rendering, code highlighting, file attachments, keyboard shortcuts. These libraries solve it all. |
| Conversation memory management | Manual message truncation logic | LangChain's ConversationSummaryBufferMemory or custom summarization | Lost-in-the-middle problem, token budget overflow, context priority - requires sophisticated algorithms. Summarization libraries handle edge cases. |
| Markdown rendering | String replace + dangerouslySetInnerHTML | react-markdown + remark/rehype plugins | Security (XSS), syntax highlighting, custom components, link handling, image sizing - markdown is more complex than it looks. |
| Rate limiting | Custom counters in database | Redis with TTL + sliding window algorithm | Race conditions, distributed systems, atomic operations, auto-expiration - Redis handles concurrency correctly. |
| Prompt caching | Manual cache key generation | Anthropic's built-in prompt caching | Cache validation, hit rate optimization, cost accounting - Anthropic SDK manages cache lifecycle. |

**Key insight:** Conversational AI interfaces have been battle-tested by companies like OpenAI, Anthropic, and Stream. Their patterns (streaming, thinking indicators, message persistence, context management) solve problems you'll discover only after building from scratch. Leverage existing libraries to avoid 80% of edge cases.

## Common Pitfalls

### Pitfall 1: Token Budget Overflow with Raw Transaction Data

**What goes wrong:** Passing 6 months of raw transactions (5,000+ records) to Claude exceeds 200K context window, triggers errors, or costs $10+ per chat message.

**Why it happens:** Naive approach of "give Claude everything" seems comprehensive but doesn't account for token limits or cost multiplication.

**How to avoid:**
- Build compact financial summaries (see Pattern 1) with aggregated totals, trends, top merchants
- Limit summary to last 6 months, top 10 merchants per category, 5 recurring transactions
- Target 1-2K tokens for financial context, leaving 198K for conversation history
- Use prompt caching on financial summary for 90% cost reduction on repeated context

**Warning signs:**
- API errors about context length exceeded
- Chat messages taking 10+ seconds to respond
- API costs > $1 per message
- Claude responses starting mid-sentence or cutting off

### Pitfall 2: Conversation History Explosion

**What goes wrong:** After 20+ messages in a session, context window fills with conversation history, new messages fail or costs spike.

**Why it happens:** Each message includes full conversation history for Claude to maintain context. 20 messages × 500 tokens avg = 10K tokens before user even asks new question.

**How to avoid:**
- Implement conversation summarization after every 10-15 messages
- Use sliding window: keep last 5 messages verbatim + summary of older messages
- Store full history in database but send compressed version to Claude
- Monitor token usage per request, trigger summarization at 150K threshold

**Warning signs:**
- Increasing response latency as conversation progresses
- API errors after long conversations
- Costs increasing linearly with conversation length
- Claude losing context from early in conversation

### Pitfall 3: Streaming Failures with No Partial Recovery

**What goes wrong:** Network hiccup during streaming leaves UI frozen with partial message, user gets no response, must retry from scratch.

**Why it happens:** SSE connections are fragile, treating stream interruption as fatal error discards accumulated tokens.

**How to avoid:**
- Accumulate streamed tokens in backend and database
- On stream error, check if partial response exists, display it with retry option
- Implement Anthropic SDK's message accumulation and error recovery
- Use circuit breaker pattern: after 3 failures, fall back to non-streaming mode

**Warning signs:**
- Users report "frozen" chat UI
- Blank message bubbles after network issues
- High retry rates
- Support tickets about "didn't get response"

### Pitfall 4: No Insight Invalidation After New Data

**What goes wrong:** Pre-generated insights stay cached even after user imports new statement, insights become stale and misleading ("Your spending is down 20%" when new statement shows spike).

**Why it happens:** Insight generation is expensive (multiple Claude calls), tempting to cache aggressively without invalidation logic.

**How to avoid:**
- Store insights with `dataSnapshot` JSON field containing summary used to generate
- On statement import, set `invalidatedAt` timestamp on all existing insights
- Query insights with `WHERE invalidatedAt IS NULL` to exclude stale
- Trigger background job to regenerate insights after import completes

**Warning signs:**
- Users report insights don't match current data
- Insights reference transactions that are weeks old
- Dashboard shows different numbers than planning insights
- Insights don't update after statement import

### Pitfall 5: Missing Legal Disclaimers on AI Advice

**What goes wrong:** AI provides financial recommendations without disclaimer, creates regulatory/liability risk if user acts on advice and suffers loss.

**Why it happens:** Developer focuses on functionality, overlooks compliance requirement from PLAN-05.

**How to avoid:**
- Append disclaimer to EVERY assistant message automatically in backend before saving
- Use system prompt to remind Claude to include disclaimer
- Add visual disclaimer badge to UI (💼 or ⚠️ icon)
- Store disclaimer as part of message metadata for audit trail

**Warning signs:**
- Assistant messages without disclaimer in production
- Legal/compliance review flags missing disclaimers
- Inconsistent disclaimer placement
- Disclaimer only on some message types (advice but not general chat)

### Pitfall 6: Unvalidated Goal Parsing Creating Broken Records

**What goes wrong:** User says "save $5 for coffee" and AI creates SavingsGoal with targetAmount=$5, pollutes goals list with trivial entries.

**Why it happens:** Freeform parsing accepts any goal-like input without business logic validation.

**How to avoid:**
- Validate parsed goals: targetAmount must be >= $100, deadline must be future date
- Check confidence score from Claude, reject goals with confidence < 70
- Confirm goal with user before creating ("Did you mean save $5,000 for coffee shop business?")
- Implement 3-5 active goal limit, prevent goal spam

**Warning signs:**
- SavingsGoal table filled with $5, $10 test goals
- Users frustrated by accidental goal creation
- Goal list cluttered with trivial entries
- Support tickets about "can't delete goals"

## Code Examples

Verified patterns from official sources:

### Streaming Chat Response with Prompt Caching

```typescript
// Source: https://platform.claude.com/docs/en/api/streaming
// Combines streaming + prompt caching for 90% cost reduction

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function streamFinancialAdvice(
  userId: string,
  userMessage: string,
  financialSummary: FinancialSummary,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
) {
  // Build cached system prompt - only charged once, reused for 5 minutes
  const systemBlocks = [
    {
      type: 'text' as const,
      text: `You are a friendly financial advisor. Use conversational tone.

Financial Summary:
${JSON.stringify(financialSummary, null, 2)}

Guidelines:
- Reference specific data from summary
- Provide actionable recommendations
- Include benchmark comparisons
- Celebrate progress

IMPORTANT: End every response with:
"📌 Not professional financial advice. Consult a licensed advisor."`,
      cache_control: { type: 'ephemeral' as const },
    },
  ];

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    system: systemBlocks,
    messages: [
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ],
  });

  // Emit chunks via SSE or GraphQL subscription
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      // Yield to frontend via subscription or SSE endpoint
      yield {
        type: 'text_chunk',
        content: event.delta.text,
      };
    } else if (event.type === 'message_start') {
      // Signal start of message
      yield {
        type: 'message_start',
        messageId: event.message.id,
      };
    } else if (event.type === 'message_delta') {
      // Include usage stats
      yield {
        type: 'usage',
        usage: event.usage,
      };
    }
  }

  const finalMessage = await stream.finalMessage();

  // Save complete message to database
  await prisma.chatMessage.create({
    data: {
      sessionId,
      role: 'assistant',
      content: finalMessage.content[0].text,
      metadata: {
        model: finalMessage.model,
        tokens: finalMessage.usage.output_tokens,
        cachedTokens: finalMessage.usage.cache_read_input_tokens,
      },
    },
  });
}
```

### GraphQL Subscription for Real-Time Chat

```typescript
// Source: https://www.apollographql.com/docs/apollo-server/data/subscriptions/
// spendwise-api/src/schema/resolvers/financialPlanning.ts

import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

export const financialPlanningResolvers = {
  Mutation: {
    sendChatMessage: async (
      _: unknown,
      { sessionId, content }: { sessionId: string; content: string },
      context: Context
    ) => {
      const user = requireAuth(context);

      // Check rate limit
      const rateLimit = await checkRateLimit(user.id);
      if (!rateLimit.allowed) {
        throw new Error(`Daily message limit reached. Resets at ${rateLimit.resetAt.toISOString()}`);
      }

      // Save user message
      await context.prisma.chatMessage.create({
        data: {
          sessionId,
          role: 'user',
          content,
        },
      });

      // Increment usage
      await incrementUsage(user.id);

      // Build financial summary
      const summary = await buildFinancialSummary(context.prisma, user.id);

      // Get conversation history
      const history = await context.prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        take: 20, // Last 20 messages
      });

      // Stream response
      const stream = streamChatResponse(
        history.map(m => ({ role: m.role, content: m.content })),
        summary,
        content
      );

      // Publish chunks to subscription
      for await (const chunk of stream) {
        pubsub.publish('CHAT_MESSAGE_CHUNK', {
          sessionId,
          chunk,
        });
      }

      return { success: true };
    },
  },

  Subscription: {
    chatMessageStream: {
      subscribe: (_: unknown, { sessionId }: { sessionId: string }) => {
        return pubsub.asyncIterator(`CHAT_MESSAGE_CHUNK`);
      },
      resolve: (payload: any) => {
        if (payload.sessionId === payload.variables.sessionId) {
          return payload.chunk;
        }
        return null;
      },
    },
  },
};
```

### Pre-Generated Insights with Ranking

```typescript
// Source: Research on financial prompt engineering + existing advice resolver pattern
// spendwise-api/src/services/financialPlanning/insight-generator.ts

import Anthropic from '@anthropic-ai/sdk';

interface GeneratedInsight {
  type: 'spending_anomaly' | 'savings_opportunity' | 'investment_observation';
  title: string;
  content: string;
  priority: number; // 1 = highest impact
  dataSnapshot: FinancialSummary;
}

export async function generateInsights(
  prisma: PrismaClient,
  userId: string
): Promise<GeneratedInsight[]> {
  const summary = await buildFinancialSummary(prisma, userId);

  // Require 2-3 months minimum data
  const monthsOfData = summary.trends.monthlyExpenses.length;
  if (monthsOfData < 2) {
    return [];
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    temperature: 0.3,
    system: `You are a financial analyst generating personalized insights.

Generate 3-5 insights for this user:
1. Spending anomalies (unusual spikes, category overspending)
2. Savings opportunities (subscription cancellations, spending reductions)
3. Investment observations (allocation rebalancing, diversification)

Each insight must include:
- type: "spending_anomaly" | "savings_opportunity" | "investment_observation"
- title: Short headline (max 60 chars)
- content: 2-3 paragraph analysis (what happened, why it matters, what to do)
- priority: 1-5 (1 = highest impact/savings potential)

Format as JSON array. Rank by impact - biggest savings/issues first.`,
    messages: [
      {
        role: 'user',
        content: JSON.stringify(summary, null, 2),
      },
    ],
  });

  const insights = JSON.parse(response.content[0].text);

  // Cache insights in database
  await prisma.$transaction(
    insights.map((insight: any) =>
      prisma.insightCache.create({
        data: {
          userId,
          insightType: insight.type,
          title: insight.title,
          content: insight.content,
          priority: insight.priority,
          dataSnapshot: summary,
        },
      })
    )
  );

  return insights;
}
```

### Inline Chart Embedding in Chat Response

```typescript
// Source: Recharts documentation + research on embedded visualizations
// spendwise/src/components/planning/InlineChart.tsx

'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface InlineChartProps {
  type: 'trend' | 'breakdown';
  data: any[];
  title: string;
}

export function InlineChart({ type, data, title }: InlineChartProps) {
  if (type === 'trend') {
    return (
      <div className="my-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium mb-2">{title}</h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <XAxis dataKey="month" style={{ fontSize: 12 }} />
            <YAxis style={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Breakdown pie chart or bar chart
  return null;
}

// Usage in chat message renderer:
// Parse markdown response from Claude, detect chart markers like:
// [CHART:trend:spending_6m]
// Replace with <InlineChart> component

function ChatMessageContent({ content }: { content: string }) {
  const parts = content.split(/\[CHART:(\w+):(\w+)\]/);

  return (
    <>
      {parts.map((part, i) => {
        if (i % 3 === 0) {
          // Regular text
          return <ReactMarkdown key={i}>{part}</ReactMarkdown>;
        } else if (i % 3 === 1) {
          // Chart type
          const chartType = part;
          const chartData = parts[i + 1]; // Next part is data key
          return (
            <InlineChart
              key={i}
              type={chartType as 'trend' | 'breakdown'}
              data={getChartData(chartData)} // Fetch from context
              title={chartData}
            />
          );
        }
        return null;
      })}
    </>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| OpenAI GPT-4 for financial chat | Anthropic Claude Sonnet 4.5 | Jan 2025 | 67% cost reduction ($30/$60 → $3/$15 per MTok), extended context (200K standard), better financial reasoning |
| WebSockets for streaming | Server-Sent Events (SSE) | 2023-2024 | Simpler implementation, firewall-proof, HTTP/2 multiplexing, GraphQL over SSE support |
| Custom chat UI components | Specialized libraries (assistant-ui, shadcn/ui AI) | 2024-2025 | Production-ready streaming, thinking indicators, accessibility, markdown rendering out-of-box |
| Long polling for real-time updates | GraphQL subscriptions with SSE | 2024 | Lower latency, less overhead, leverages existing Apollo infrastructure |
| JSONB for chat messages | Relational tables with proper schema | Always best | Better queries, relationships, indexes, type safety |
| Manual token counting | Anthropic SDK built-in usage tracking | 2024 | Accurate costs including cache reads/writes, no estimation needed |
| Prompt engineering trial-and-error | Prompt caching + structured system prompts | 2024-2025 | 90% cost reduction on repeated context, consistent outputs |

**Deprecated/outdated:**
- **WebSocket chat implementations:** SSE is now standard for unidirectional streaming (server → client), simpler and more reliable than WebSockets for this use case
- **Sending full conversation history on every request:** Prompt caching enables sending large context once, reusing for 5 minutes with 90% discount
- **Custom markdown parsers:** react-markdown with remark/rehype plugins is the de-facto standard, handles security and extensibility
- **Fixed token budgets without rate limiting:** With Claude's low costs, focus shifted to usage caps over strict token limits

## Open Questions

Things that couldn't be fully resolved:

1. **Exact message rate limit (20-30 range)**
   - What we know: CONTEXT.md specifies 20-30 messages per day, research shows Redis TTL pattern for daily limits
   - What's unclear: Whether 25 is optimal balance between user experience and cost control for this app's financial profile
   - Recommendation: Start with 25 (middle of range), monitor API costs in production, adjust based on actual spending patterns vs user engagement

2. **Minimum data threshold per insight type**
   - What we know: CONTEXT.md specifies 2-3 months minimum, research shows "lost-in-the-middle" issues with insufficient data
   - What's unclear: Whether spending anomalies need less data (1 month) vs investment observations needing more (6 months)
   - Recommendation: Use 2 months for spending anomalies (detect spikes), 3 months for savings opportunities and investment observations (need trend data). Add data sufficiency check per insight type in generator.

3. **Chart types for inline visualizations**
   - What we know: Recharts already in stack, supports line, bar, pie, area charts. CONTEXT.md mentions "inline charts in chat responses."
   - What's unclear: Which chart types are most effective for financial insights embedded in chat (vs dedicated analytics page)
   - Recommendation: Start with line charts for trends (spending over time), bar charts for category breakdowns, limit to 200px height for "glanceable" inline context. Defer interactive charts to analytics page.

4. **Conversation summarization trigger point**
   - What we know: Research shows performance degradation beyond 32K-130K tokens, Claude Sonnet 4.5 supports 200K standard context
   - What's unclear: At what message count or token count to trigger conversation summarization vs relying on full context window
   - Recommendation: Monitor token usage, trigger summarization when conversation exceeds 150K tokens OR 15 messages, whichever comes first. Keep last 5 messages verbatim + summary of older messages.

5. **Goal parsing edge cases**
   - What we know: Claude can extract goal details from freeform text using structured outputs, similar to existing categorizer pattern
   - What's unclear: How to handle ambiguous inputs ("save for the future"), conflicting goals ("save $5K but need $10K"), or goals outside SavingsGoal model (debt payoff, investment allocation)
   - Recommendation: Return confidence score with parsed goal, require confirmation dialog if confidence < 80, expand SavingsGoal model to support goalType enum (savings, debt_payoff, investment) for Phase 7.

## Sources

### Primary (HIGH confidence)

- [Anthropic Claude API - Streaming Documentation](https://platform.claude.com/docs/en/api/streaming) - Official streaming implementation guide
- [GitHub - anthropics/anthropic-sdk-typescript](https://github.com/anthropics/anthropic-sdk-typescript) - Official TypeScript SDK with streaming examples
- [Anthropic API Pricing 2026](https://platform.claude.com/docs/en/about-claude/pricing) - Current Claude 4.5 pricing structure
- [GitHub - assistant-ui/assistant-ui](https://github.com/assistant-ui/assistant-ui) - React library for AI chat interfaces with 200K+ downloads/month
- [Redis Rate Limiting Documentation](https://redis.io/glossary/rate-limiting/) - Official Redis rate limiting patterns
- [Recharts Documentation](https://recharts.github.io/en-US/examples/) - Chart library already in stack
- Existing codebase:
  - `/spendwise-api/src/lib/ai/categorizer.ts` - Pattern for OpenAI Structured Outputs, merchant rules, Redis caching
  - `/spendwise-api/src/schema/resolvers/advice.ts` - Existing financial analysis logic, 50/30/20 budget calculations
  - `/spendwise-api/prisma/schema.prisma` - Current models (User, SavingsGoal, Transaction, RecurringTransaction)

### Secondary (MEDIUM confidence)

- [Building Realtime Chat Apps with GraphQL Streaming Subscriptions](https://hasura.io/blog/building-real-time-chat-apps-with-graphql-streaming-subscriptions) - GraphQL subscriptions for chat
- [Context Window Management Strategies for LLM Agents](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/) - Conversation memory best practices
- [Prompt Compression for LLM Generation Optimization](https://machinelearningmastery.com/prompt-compression-for-llm-generation-optimization-and-cost-reduction/) - Token optimization techniques
- [Navigating AI Compliance in Financial Services 2026](https://www.advisorengine.com/action-magazine/articles/navigating-ai-compliance-a-risk-based-framework-for-financial-services-in-2026) - Regulatory guidance for AI financial advice
- [PostgreSQL Chat Message History - LangChain](https://reference.langchain.com/v0.3/python/postgres/chat_message_histories/langchain_postgres.chat_message_histories.PostgresChatMessageHistory.html) - Chat persistence schema patterns
- [Intent Classification in NLP 2025](https://labelyourdata.com/articles/machine-learning/intent-classification) - NLP goal extraction techniques

### Tertiary (LOW confidence)

- Web search results for "financial summary prompt engineering" - General best practices, not SpendWise-specific
- Web search results for "React streaming chat interface" - UI patterns, multiple library options discussed
- Web search results for "inline charts markdown chat response" - Emerging pattern, limited production examples

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Anthropic SDK, assistant-ui, GraphQL subscriptions are industry-standard with official documentation
- Architecture: HIGH - Patterns verified in official docs (streaming, caching, rate limiting) and existing codebase (categorizer, advice resolver)
- Pitfalls: MEDIUM - Based on research + general LLM application experience, not SpendWise-specific production data
- Code examples: HIGH - Adapted from official Anthropic docs + existing working code in categorizer.ts

**Research date:** 2026-02-02
**Valid until:** ~30 days (Anthropic SDK stable, UI libraries mature, patterns well-established)

**Note:** Phase 7 builds heavily on existing patterns from Phase 2 (AI categorization) - same OpenAI Structured Outputs approach applies to Claude, Redis caching patterns reusable, financial data aggregation already proven in advice.ts resolver. The primary new technical surface area is streaming SSE/subscriptions and conversational UI components.
