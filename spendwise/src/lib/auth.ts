import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from './prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        token: { label: 'Token', type: 'text' },
      },
      async authorize(credentials) {
        // Check if pre-authenticated token provided (from registration/2FA flow)
        if (credentials?.token) {
          try {
            const decoded = jwt.verify(credentials.token, process.env.NEXTAUTH_SECRET!) as {
              id: string;
              email: string;
              name?: string;
            };

            const user = await prisma.user.findUnique({
              where: { id: decoded.id },
            });

            if (!user) {
              throw new Error('User not found');
            }

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
            };
          } catch (error) {
            throw new Error('Invalid token');
          }
        }

        // Otherwise handle email/password flow
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error('Invalid credentials');
        }

        if (!user.password) {
          throw new Error('This account uses Google sign-in');
        }

        const isValid = await compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error('Invalid credentials');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          authorization: {
            params: {
              prompt: 'consent',
            },
          },
        })]
      : []),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === 'google') {
        const googleProfile = profile as { email?: string; email_verified?: boolean; name?: string; picture?: string };

        if (!googleProfile?.email || !googleProfile?.email_verified) {
          return '/login?error=EmailNotVerified';
        }

        try {
          const email = googleProfile.email.toLowerCase();
          const existingUser = await prisma.user.findUnique({
            where: { email },
          });

          if (existingUser) {
            // Account linking: update emailVerified, backfill image/name if missing
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                emailVerified: true,
                ...((!existingUser.image && googleProfile.picture) ? { image: googleProfile.picture } : {}),
                ...((!existingUser.name && googleProfile.name) ? { name: googleProfile.name } : {}),
              },
            });
          } else {
            // Create new user from Google profile
            await prisma.user.create({
              data: {
                email,
                name: googleProfile.name || null,
                password: null,
                image: googleProfile.picture || null,
                emailVerified: true,
              },
            });
          }

          return true;
        } catch (error) {
          return '/login?error=OAuthAccountError';
        }
      }

      // Credentials flow — always allow
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === 'google') {
          // Google sets user.id to its sub, not our DB id — look up the real DB user
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email!.toLowerCase() },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.picture = dbUser.image;
          }
        } else {
          // Credentials path
          token.id = user.id;
        }
        token.email = user.email;
        token.name = user.name;
      }
      // Regenerate short-lived access token on every session access
      token.accessToken = jwt.sign(
        { id: token.id, email: token.email, name: token.name },
        process.env.NEXTAUTH_SECRET!,
        { expiresIn: '1h' }
      );
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.image = (token.picture as string) || null;
      }
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Type augmentation for next-auth
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    };
    accessToken: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    accessToken: string;
  }
}
