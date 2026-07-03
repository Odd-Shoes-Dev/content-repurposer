import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { getDBProvider } from './db';
import { config } from './config';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
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
    async signIn({ user, account }) {
      // Handle OAuth providers (Google)
      if (account?.provider === 'google' && user.email) {
        const db = getDBProvider();
        try {
          const existingUser = await db.getUserByEmail(user.email);

          if (existingUser) {
            const row = existingUser as unknown as { deleted_at?: string; scheduled_deletion_at?: string };
            if (row.deleted_at) {
              const scheduledDeletion = row.scheduled_deletion_at ? new Date(row.scheduled_deletion_at) : null;
              if (scheduledDeletion && scheduledDeletion > new Date()) {
                return `/auth/signin?error=ACCOUNT_PENDING_DELETION:${scheduledDeletion.toISOString()}`;
              }
              return false;
            }
            // Replace Google's subject ID with the DB user ID so jwt callback gets the right ID
            user.id = existingUser.id;
            return true;
          }

          // Create new user from Google OAuth
          const newUser = await db.createUser({
            email: user.email,
            name: user.name || user.email.split('@')[0],
            passwordHash: '',
          });
          // Attach DB id so jwt callback stores the correct ID in the token
          user.id = newUser.id;
          return true;
        } catch {
          return false;
        }
      }

      return true;
    },
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
