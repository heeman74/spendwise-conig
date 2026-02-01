import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

interface JWTPayload {
  id: string;
  email: string;
  name?: string;
  iat: number;
  exp: number;
}

export async function getUserFromToken(token: string | undefined): Promise<AuthUser | null> {
  console.log('🔐 Auth Debug - Token received:', token ? 'YES' : 'NO');
  console.log('🔐 Auth Debug - JWT_SECRET available:', process.env.JWT_SECRET ? 'YES' : 'NO');
  console.log('🔐 Auth Debug - JWT_SECRET starts with:', process.env.JWT_SECRET?.substring(0, 10));

  if (!token) {
    console.log('🔐 Auth Debug - No token provided');
    return null;
  }

  try {
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    console.log('🔐 Auth Debug - Clean token starts with:', cleanToken.substring(0, 20) + '...');

    // Verify JWT using same secret as NextAuth
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET!) as JWTPayload;
    console.log('🔐 Auth Debug - JWT verified successfully for user:', decoded.id);

    // Fetch full user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
      },
    });

    console.log('🔐 Auth Debug - User found in DB:', user ? 'YES' : 'NO');
    return user;
  } catch (error) {
    console.error('🔐 Auth Debug - JWT verification failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

export function signToken(user: { id: string; email: string; name?: string | null }): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' }
  );
}
