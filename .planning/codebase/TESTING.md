# Testing Patterns

**Analysis Date:** 2026-01-30

## Test Framework

**Runner:**
- Jest 29.7.0
- Frontend: Jest with Next.js preset (`ts-jest` transformer)
- Backend: Jest with ts-jest preset targeting Node.js

**Assertion Library:**
- Jest built-in matchers (expect)
- Testing Library for React components (`@testing-library/react`)

**Run Commands:**
```bash
# Frontend
npm test                    # Run all Jest tests (frontend)
npm test:watch             # Jest in watch mode
npm test:coverage          # Jest with coverage report

# Backend
npm test                    # Run all Jest tests (backend)
npm test:watch             # Jest in watch mode
npm test:coverage          # Jest with coverage report

# E2E (Frontend only)
npm run test:e2e           # Playwright E2E tests
npm run test:e2e:ui        # Playwright with UI
```

## Test File Organization

**Location:**
- Frontend: Co-located with source files in `src/__tests__/` subdirectories
- Backend: Co-located in `src/__tests__/` subdirectories

**Naming:**
- `.test.ts` suffix for unit and integration tests
- `.spec.ts` suffix also supported
- Example structure:
  ```
  src/__tests__/
    ├── components/
    │   ├── Card.test.tsx
    │   ├── StatsCard.test.tsx
    │   └── auth/
    │       ├── TwoFactorSetup.test.tsx
    │       └── TwoFactorVerify.test.tsx
    ├── hooks/
    │   ├── useTransactions.test.ts
    │   ├── useAccounts.test.ts
    │   └── useDashboard.test.ts
    ├── resolvers/
    │   ├── user.test.ts
    │   ├── transaction.test.ts
    │   └── account.test.ts
    ├── mocks/
    │   └── data.ts
    └── setup.ts
  ```

**Structure:**
- Setup file imported by Jest config: `setupFilesAfterEnv`
- Frontend: `src/__tests__/setup.ts`
- Backend: `jest.setup.ts` (at project root)
- Mock data centralized: `src/__tests__/mocks/data.ts`

## Test Structure

**Suite Organization:**

Frontend (React Testing Library pattern):
```typescript
import { render, screen } from '@testing-library/react';
import Card from '@/components/ui/Card';

describe('Card Components', () => {
  describe('Card', () => {
    it('should render children', () => {
      render(<Card>Card Content</Card>);
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('should apply variant styles', () => {
      const { container } = render(<Card variant="bordered">Content</Card>);
      const card = container.firstChild;
      expect(card).toHaveClass('border');
    });
  });

  describe('CardHeader', () => {
    // Tests for subcomponent
  });
});
```

Backend (Resolver pattern):
```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { userResolvers } from '../../schema/resolvers/user';
import { mockUser, mockContext } from '../mocks/data';
import { prisma } from '../../lib/prisma';

describe('User Resolvers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query.me', () => {
    it('should return current user when authenticated', async () => {
      const userWithRelations = { ...mockUser, accounts: [], goals: [] };
      (prisma.user.findUnique as any).mockResolvedValue(userWithRelations);

      const context = { ...mockContext, prisma };
      const result = await userResolvers.Query.me(null, {}, context as any);

      expect(result).toEqual(userWithRelations);
    });
  });
});
```

**Patterns:**

- `describe()` blocks organize tests by component/resolver or functionality
- `it()` or `test()` for individual test cases
- One assertion per test or related assertions for compound behavior
- Nested `describe()` blocks for sub-components or related functionality
- `beforeEach()` for setup; runs before each test in the block
- Test names describe expected behavior: "should [action] when [condition]"

## Mocking

**Framework:** Jest's native mocking (`jest.mock()`, `jest.fn()`)

**Global Mocks (Frontend):** `src/__tests__/setup.ts`
```typescript
// Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), ... }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({ data: null, status: 'unauthenticated' })),
  getSession: jest.fn(() => null),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

// Apollo Client
jest.mock('@apollo/client/react', () => ({
  useQuery: jest.fn(() => ({ data: undefined, loading: false, error: undefined, ... })),
  useMutation: jest.fn(() => [jest.fn(), { loading: false, error: undefined }]),
  useApolloClient: jest.fn(() => ({ cache: { evict: jest.fn(), gc: jest.fn() } })),
}));

// Redux
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: () => jest.fn(),
}));

// Browser APIs
Object.defineProperty(window, 'IntersectionObserver', { value: MockIntersectionObserver });
Object.defineProperty(window, 'ResizeObserver', { value: MockResizeObserver });
Object.defineProperty(window, 'matchMedia', { value: jest.fn().mockImplementation(...) });
```

**Global Mocks (Backend):** `jest.setup.ts`
```typescript
// Mock Prisma
jest.mock('./src/lib/prisma', () => ({
  prisma: require('./src/__mocks__/prisma').mockPrismaClient,
}));

// Mock Redis with ioredis-mock
const Redis = require('ioredis-mock');
const redisInstance = new Redis();

jest.mock('./src/lib/redis', () => ({
  redis: redisInstance,
  getCache: jest.fn(async (key: string) => {
    const data = await redisInstance.get(key);
    return data ? JSON.parse(data) : null;
  }),
  setCache: jest.fn(async (key: string, data: any, ttlSeconds: number) => {
    await redisInstance.setex(key, ttlSeconds, JSON.stringify(data));
  }),
  invalidateCache: jest.fn(async (pattern: string) => {
    const keys = await redisInstance.keys(pattern);
    if (keys.length > 0) await redisInstance.del(...keys);
  }),
}));

// Environment variables for tests
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.ENCRYPTION_KEY = '0123456789abcdef...';
```

**Module-Level Mocks:**
```typescript
// Example from useTransactions.test.ts
jest.mock('@apollo/client/react', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useApolloClient: jest.fn(),
}));

// Example from user.test.ts (backend)
jest.mock('bcryptjs', () => ({
  hash: jest.fn<any>().mockResolvedValue('$2a$12$hashedpassword'),
  compare: jest.fn(),
}));

jest.mock('../../context/auth', () => ({
  signToken: jest.fn().mockReturnValue('mock-jwt-token'),
}));
```

**Patterns:**

Mock return values:
```typescript
(useQuery as jest.Mock).mockReturnValue({
  data: mockTransactionsQueryResponse,
  loading: false,
  error: undefined,
  refetch: jest.fn(),
  fetchMore: jest.fn(),
});

(prisma.user.findUnique as any).mockResolvedValue(mockUser);
(compare as any).mockResolvedValue(true);
```

Mock verification:
```typescript
expect(useQuery).toHaveBeenCalledWith(
  expect.anything(),
  expect.objectContaining({
    variables: expect.objectContaining({ filters }),
  })
);

expect(prisma.user.findUnique).toHaveBeenCalledWith({
  where: { id: 'user-123' },
  include: { accounts: true, goals: true },
});
```

**What to Mock:**
- External HTTP calls (Apollo, REST APIs)
- Database operations (Prisma)
- Cache operations (Redis)
- Authentication libraries (bcryptjs, jsonwebtoken)
- Next.js APIs (useRouter, useSession, navigation)
- Browser APIs (IntersectionObserver, ResizeObserver, matchMedia)

**What NOT to Mock:**
- Pure utility functions
- React components (test actual rendering with React Testing Library)
- Business logic in resolvers (test with mocked dependencies)
- GraphQL type definitions

## Fixtures and Factories

**Test Data:**

Frontend (`src/__tests__/mocks/data.ts`):
```typescript
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  image: null,
};

export const mockTransactions = [
  {
    id: 'txn-1',
    accountId: 'acc-1',
    amount: 150.0,
    type: 'EXPENSE',
    category: 'Food & Dining',
    merchant: 'Whole Foods',
    description: 'Weekly groceries',
    date: new Date('2024-01-14'),
    account: mockAccounts[0],
  },
  // ... more transactions
];

export const mockTransactionsQueryResponse = {
  transactions: {
    edges: mockTransactions.map((t, i) => ({
      node: t,
      cursor: Buffer.from(`${i}`).toString('base64'),
    })),
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      totalCount: mockTransactions.length,
      totalPages: 1,
    },
  },
};
```

Backend (`src/__tests__/mocks/data.ts`):
```typescript
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
  image: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockContext = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    image: null,
  },
};

export const mockUnauthenticatedContext = {
  user: null,
};
```

**Location:**
- Centralized in `src/__tests__/mocks/data.ts` for both frontend and backend
- Import and reuse across test files
- Keep mock data consistent with actual schema/types

**Factories (Pattern):**
- No factory libraries (like factory-boy) used
- Static mock objects created and used directly
- Spread operator used to create variations: `{ ...mockUser, name: 'Updated Name' }`

## Coverage

**Requirements:** No explicit coverage targets enforced in CI

**View Coverage:**

Frontend:
```bash
npm run test:coverage
# Output: coverage/ directory with HTML report
```

Backend:
```bash
npm test:coverage
# Output: coverage/ directory with HTML report
```

**Configuration (Frontend `jest.config.js`):**
```javascript
collectCoverageFrom: [
  'src/**/*.{ts,tsx}',
  '!src/**/*.d.ts',
  '!src/__tests__/**',
  '!src/app/layout.tsx',
  '!src/app/providers.tsx',
],
coverageDirectory: 'coverage',
coverageReporters: ['text', 'lcov', 'html'],
```

**Configuration (Backend `jest.config.js`):**
```javascript
collectCoverageFrom: [
  'src/**/*.ts',
  '!src/**/*.d.ts',
  '!src/index.ts',
],
coverageDirectory: 'coverage',
coverageReporters: ['text', 'lcov', 'html'],
```

## Test Types

**Unit Tests:**
- Scope: Individual functions, hooks, resolvers
- Approach: Test with mocked dependencies
- Example: `Card.test.tsx` tests Card component variants and props
- Example: `user.test.ts` tests login, register, updateProfile mutations
- Mock all external calls (Prisma, Apollo, bcryptjs)

**Integration Tests:**
- Scope: Multiple resolvers or services working together
- Example: `graphql.test.ts` tests full GraphQL query execution
- May use some real implementations alongside mocks
- Test resolver interactions with context and database

**E2E Tests:**
- Scope: Full user workflows (Frontend only with Playwright)
- Example: `e2e/auth.spec.ts` tests login/register flow
- Uses browser automation
- Tests actual GraphQL API calls (backend running)

**Test Execution Environment:**
- Frontend: JSDOM (browser-like environment)
- Backend: Node.js environment
- Tests run in isolation with setup/teardown

## Common Patterns

**Async Testing:**

Frontend (with React Testing Library):
```typescript
const { result } = renderHook(() => useTransactions());

await act(async () => {
  await result.current.createTransaction(input);
});

expect(mockMutate).toHaveBeenCalledWith({
  variables: { input },
});
```

Backend (resolver):
```typescript
it('should return token and user on successful login', async () => {
  (prisma.user.findUnique as any).mockResolvedValue(mockUser);
  (compare as any).mockResolvedValue(true);

  const result = await userResolvers.Mutation.login(
    null,
    { email: 'test@example.com', password: 'password123' },
    context as any
  );

  expect(result).toHaveProperty('token', 'mock-jwt-token');
  expect(result.user.email).toBe('test@example.com');
});
```

**Error Testing:**

GraphQL Errors:
```typescript
await expect(
  userResolvers.Mutation.login(
    null,
    { email: 'test@example.com', password: 'wrongpassword' },
    context as any
  )
).rejects.toMatchObject({
  message: 'Invalid credentials',
  extensions: { code: 'UNAUTHENTICATED' },
});
```

Component Behavior:
```typescript
it('should throw UNAUTHENTICATED when not logged in', async () => {
  const context = { ...mockUnauthenticatedContext, prisma };

  await expect(
    userResolvers.Mutation.updateProfile(null, { name: 'Test' }, context as any)
  ).rejects.toMatchObject({
    extensions: { code: 'UNAUTHENTICATED' },
  });
});
```

**Pagination Testing:**
```typescript
it('should return paginated transactions', async () => {
  const mockTxns = [{ id: 'txn-1' }, { id: 'txn-2' }];
  (prisma.transaction.findMany as any).mockResolvedValue(mockTxns);
  (prisma.transaction.count as any).mockResolvedValue(2);

  const result = await userResolvers.User.transactions(
    { id: 'user-123' },
    { pagination: { page: 1, limit: 20 } },
    context as any
  );

  expect(result.edges).toHaveLength(2);
  expect(result.pageInfo.totalCount).toBe(2);
  expect(result.pageInfo.hasNextPage).toBe(false);
});
```

**Hook Testing with Mock Data:**
```typescript
it('should return transactions when loaded', () => {
  (useQuery as jest.Mock).mockReturnValue({
    data: mockTransactionsQueryResponse,
    loading: false,
    error: undefined,
    refetch: jest.fn(),
    fetchMore: jest.fn(),
  });

  const { result } = renderHook(() => useTransactions());

  expect(result.current.loading).toBe(false);
  expect(result.current.transactions).toHaveLength(mockTransactions.length);
});
```

## Test Cleanup

**Before Each Test:**
```typescript
beforeEach(() => {
  jest.clearAllMocks();
  // Backend also clears Redis
  await redisInstance.flushall();
});
```

**Global Cleanup:**
- Jest timeout: 10000ms (10 seconds)
- afterEach automatically clears mocks
- Console error suppression: React warnings filtered in setup
- Test-specific cleanup: handled in individual beforeEach hooks

## Special Considerations

**React Hook Testing:**
- Use `renderHook()` from `@testing-library/react`
- Wrap async operations with `act()`
- Test hook return values, not internal state
- Mock Apollo Client hooks at global level or per-test

**Next.js Component Testing:**
- Mock `next/navigation` hooks globally
- Mock `next-auth/react` globally
- Use JSDOM test environment
- Components with `'use client'` directive work in JSDOM

**GraphQL Resolver Testing:**
- Pass null for parent resolver parameter: `null`
- Use `as any` for context casting (type safety secondary to test clarity)
- Mock Prisma client at jest.setup.ts level
- Test with mockContext and mockUnauthenticatedContext
- Verify both return values and Prisma call arguments

**Sensitive Data in Tests:**
- Test credentials and keys set in `jest.setup.ts` (backend)
- Never use real credentials in mock data
- Use placeholder values: `'test-jwt-secret-key-for-testing-only'`

---

*Testing analysis: 2026-01-30*
