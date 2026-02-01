import Redis from 'ioredis';
import { getUserFromToken, AuthUser } from './auth';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';

export interface Context {
  prisma: typeof prisma;
  redis: Redis;
  user: AuthUser | null;
}

interface ContextParams {
  req: {
    headers: {
      authorization?: string;
    };
  };
}

export async function createContext({ req }: ContextParams): Promise<Context> {
  const token = req.headers.authorization;
  const user = await getUserFromToken(token);

  return {
    prisma,
    redis,
    user,
  };
}

export type { AuthUser };
