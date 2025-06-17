
import type { NextAuthConfig, User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { LoginSchema } from '@/frontend/lib/schemas/auth.schemas';
import { connectToDatabase } from '@/backend/lib/mongodb';
import bcrypt from 'bcryptjs';
import type { UserDocument } from '@/backend/schemas/user';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      async authorize(credentials): Promise<User | null> {
        console.log('[auth.config.ts] Authorize function ENTERED. Credentials received:', 
          credentials ? { email: (credentials as any).email, hasPassword: !!(credentials as any).password } : 'null'
        );

        const validatedFields = LoginSchema.safeParse(credentials);

        if (!validatedFields.success) {
          console.log('[auth.config.ts] Zod validation failed for credentials:', validatedFields.error?.flatten().fieldErrors);
          console.log('[auth.config.ts] Authorize FAILED (validation).');
          return null; // Zod validation failed
        }
        
        const { email, password } = validatedFields.data;
        console.log('[auth.config.ts] Credentials validated for email:', email);
        
        let db;
        try {
          console.log('[auth.config.ts] Attempting to connect to database...');
          const connection = await connectToDatabase();
          db = connection.db;
          console.log('[auth.config.ts] Successfully connected to database. DB Name:', db.databaseName);
        } catch (dbConnectError: any) {
          console.error('[auth.config.ts] CRITICAL: Database connection FAILED:', dbConnectError);
          console.error('[auth.config.ts] DB Connect Error Name:', dbConnectError.name);
          console.error('[auth.config.ts] DB Connect Error Message:', dbConnectError.message);
          console.error('[auth.config.ts] DB Connect Error Stack:', dbConnectError.stack);
          console.log('[auth.config.ts] Authorize FAILED (database connection error).');
          return null; // Database connection error
        }

        let userDoc: UserDocument | null = null;
        try {
          console.log('[auth.config.ts] Searching for user in database with email:', email);
          userDoc = await db.collection<UserDocument>('users').findOne({ email });
        } catch (dbFindError: any) {
          console.error('[auth.config.ts] CRITICAL: Error finding user in database:', dbFindError);
          console.error('[auth.config.ts] DB Find Error Name:', dbFindError.name);
          console.error('[auth.config.ts] DB Find Error Message:', dbFindError.message);
          console.error('[auth.config.ts] DB Find Error Stack:', dbFindError.stack);
          console.log('[auth.config.ts] Authorize FAILED (database find user error).');
          return null; // Database find user error
        }

        if (!userDoc) {
          console.log('[auth.config.ts] No user found for email:', email, '. Authorize FAILED (user not found).');
          return null;
        }
        console.log('[auth.config.ts] User found for email:', email, 'User ID:', userDoc._id.toString());

        if (!userDoc.hashedPassword) {
          console.log('[auth.config.ts] User found but NO HASHED PASSWORD for email:', email, '(User ID:', userDoc._id.toString(), '). Authorize FAILED (no password).');
          return null;
        }
        
        let passwordsMatch = false;
        try {
          console.log('[auth.config.ts] Comparing passwords for user:', email);
          passwordsMatch = await bcrypt.compare(password, userDoc.hashedPassword);
        } catch (bcryptError: any) {
          console.error('[auth.config.ts] CRITICAL: Error comparing passwords with bcrypt:', bcryptError);
          console.error('[auth.config.ts] Bcrypt Error Name:', bcryptError.name);
          console.error('[auth.config.ts] Bcrypt Error Message:', bcryptError.message);
          console.error('[auth.config.ts] Bcrypt Error Stack:', bcryptError.stack);
          console.log('[auth.config.ts] Authorize FAILED (bcrypt compare error).');
          return null; // Bcrypt compare error
        }

        if (passwordsMatch) {
          console.log('[auth.config.ts] Passwords match for user:', email, '(User ID:', userDoc._id.toString(), '). Authorize SUCCESS.');
          return { id: userDoc._id.toString(), email: userDoc.email, name: userDoc.name || null, image: null };
        } else {
          console.log('[auth.config.ts] Passwords do NOT match for user:', email, '(User ID:', userDoc._id.toString(), '). Authorize FAILED (password mismatch).');
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      // console.log('[auth.config.ts] JWT callback. User:', user, 'Token:', token);
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      // console.log('[auth.config.ts] Session callback. Token:', token, 'Session:', session);
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.email = token.email;
      }
      return session;
    },
  },
  cookies: {
    // Default cookie names and options are usually fine if AUTH_SECRET is strong and unique.
    // Explicitly setting them can sometimes help in complex setups or behind proxies.
    // Example:
    // csrfToken: {
    //   name: process.env.NODE_ENV === 'production' ? '__Host-authjs.csrf-token' : 'authjs.csrf-token',
    //   options: {
    //     httpOnly: true,
    //     sameSite: 'lax',
    //     path: '/',
    //     secure: process.env.NODE_ENV === 'production',
    //   },
    // },
  },
  trustHost: true, // Recommended for development, especially if behind a proxy or custom domain.
  secret: process.env.AUTH_SECRET, // Ensure AUTH_SECRET is correctly loaded from .env.local
} satisfies NextAuthConfig;
