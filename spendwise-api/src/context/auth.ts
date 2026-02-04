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
  if (!token) {
    return null;
  }

  try {
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    // Verify JWT using same secret as NextAuth
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET!) as JWTPayload;

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

    return user;
  } catch (error) {
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
    { expiresIn: '1h' }
  );
}
