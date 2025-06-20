
import type { NextAuthConfig, User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { LoginSchema } from '@/frontend/lib/schemas/auth.schemas';
import { connectToDatabase } from '@/backend/lib/mongodb';
import bcrypt from 'bcryptjs';
import type { UserDocument } from '@/backend/schemas/user';

const MOCK_USER_ID = 'mock-user-id-for-arbi';
const MOCK_USER_EMAIL = 'arbi@gorilli.io';
const MOCK_USER_NAME = 'Arbi Gorilli (Bypass)';

const mockUser: User = {
  id: MOCK_USER_ID,
  email: MOCK_USER_EMAIL,
  name: MOCK_USER_NAME,
};

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      async authorize(credentials): Promise<User | null> {
        if (process.env.BYPASS_AUTH === 'true') {
          console.log('[auth.config.ts] BYPASS_AUTH active. Returning mock user.');
          return mockUser;
        }
        console.log('[auth.config.ts] Authorize function called. Validating credentials...');

        const validatedFields = LoginSchema.safeParse(credentials);
        if (!validatedFields.success) {
          console.error('[auth.config.ts] Zod validation failed for credentials:', validatedFields.error.flatten().fieldErrors);
          return null;
        }
        console.log('[auth.config.ts] Credentials validated by Zod successfully.');

        const { email, password } = validatedFields.data;
        console.log('[auth.config.ts] Attempting to authenticate user:', email);

        let db;
        try {
          const connection = await connectToDatabase();
          db = connection.db;
        } catch (dbConnectError: any) {
          console.error('[auth.config.ts] CRITICAL: Database connection FAILED during authorize:', dbConnectError.message);
          return null;
        }

        let userDoc: UserDocument | null = null;
        try {
          userDoc = await db.collection<UserDocument>('users').findOne({ email });
        } catch (dbFindError: any) {
          console.error('[auth.config.ts] CRITICAL: Error finding user in database:', dbFindError.message);
          return null;
        }

        if (!userDoc) {
          console.log('[auth.config.ts] No user found for email:', email);
          return null;
        }

        if (!userDoc.emailVerified) {
          console.log('[auth.config.ts] User found but email NOT VERIFIED for:', email, 'User ID:', userDoc._id.toString());
          throw new Error("Email not verified. Please check your email for the verification link/OTP.");
        }
        console.log('[auth.config.ts] User found and email verified for:', email, 'User ID:', userDoc._id.toString());

        if (!userDoc.hashedPassword) {
          console.log('[auth.config.ts] User found but NO HASHED PASSWORD for email:', email, '(User ID:', userDoc._id.toString(), '). Authentication failed.');
          return null;
        }

        const passwordsMatch = await bcrypt.compare(password, userDoc.hashedPassword);

        if (passwordsMatch) {
          console.log('[auth.config.ts] Passwords match for user:', email, '(User ID:', userDoc._id.toString(), '). Authentication SUCCESS.');
          return {
            id: userDoc._id.toString(),
            email: userDoc.email,
            name: userDoc.name || null,
          };
        } else {
          console.log('[auth.config.ts] Passwords do NOT match for user:', email);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (process.env.BYPASS_AUTH === 'true') {
        token.id = MOCK_USER_ID;
        token.email = MOCK_USER_EMAIL;
        token.name = MOCK_USER_NAME;
        // Add any other properties your session expects from the token
        return token;
      }
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (process.env.BYPASS_AUTH === 'true') {
        if (session.user) {
          session.user.id = MOCK_USER_ID;
          session.user.email = MOCK_USER_EMAIL;
          session.user.name = MOCK_USER_NAME;
        } else {
          session.user = {
            id: MOCK_USER_ID,
            email: MOCK_USER_EMAIL,
            name: MOCK_USER_NAME,
            emailVerified: null,
          } as any;
        }
        return session;
      }
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  debug: process.env.NODE_ENV === 'development',
} satisfies NextAuthConfig;
