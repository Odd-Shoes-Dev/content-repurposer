import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getDBProvider } from './db';
import { config } from './config';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        name: { label: 'Name', type: 'text' },
        isSignUp: { label: 'Sign Up', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        if (credentials.isSignUp === 'true') {
          const existing = await getDBProvider().getUserByEmail(credentials.email);
          if (existing) {
            const row = existing as unknown as { deleted_at?: string };
            if (row.deleted_at) {
              throw new Error('This email is pending account deletion and cannot be reused yet.');
            }
            throw new Error('An account with this email already exists');
          }

          const passwordHash = await bcrypt.hash(credentials.password, 12);
          const user = await getDBProvider().createUser({
            email: credentials.email,
            name: credentials.name || credentials.email.split('@')[0],
            passwordHash,
          });

          return { id: user.id, email: user.email, name: user.name };
        }

        const passwordHash = await getDBProvider().getPasswordHash(credentials.email);
        if (!passwordHash) {
          throw new Error('No account found with this email');
        }

        const isValid = await bcrypt.compare(credentials.password, passwordHash);
        if (!isValid) {
          throw new Error('Invalid password');
        }

        const user = await getDBProvider().getUserByEmail(credentials.email);
        if (!user) {
          throw new Error('User not found');
        }

        // Check for soft-deleted account
        const rawUser = user as unknown as { deleted_at?: string; scheduled_deletion_at?: string };
        if (rawUser.deleted_at) {
          const scheduledDeletion = rawUser.scheduled_deletion_at ? new Date(rawUser.scheduled_deletion_at) : null;
          if (scheduledDeletion && scheduledDeletion > new Date()) {
            throw new Error(`ACCOUNT_PENDING_DELETION:${scheduledDeletion.toISOString()}`);
          }
          throw new Error('No account found with this email');
        }

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
  secret: config.nextAuthSecret,
};
