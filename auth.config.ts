
import type { NextAuthConfig, User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { LoginSchema } from '@/frontend/lib/schemas/auth.schemas';
import { connectToDatabase } from '@/backend/lib/mongodb';
import bcrypt from 'bcryptjs';
import type { UserDocument } from '@/backend/schemas/user';

// console.log('[auth.config.ts] Value of AUTH_SECRET being read by NextAuth config (first 5 chars):', process.env.AUTH_SECRET?.substring(0,5)); // Temporary: For debugging AUTH_SECRET issues
// console.log('[auth.config.ts] Value of NEXTAUTH_URL:', process.env.NEXTAUTH_URL);

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      async authorize(credentials): Promise<User | null> {
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
          console.log('[auth.config.ts] Attempting to connect to database...');
          const connection = await connectToDatabase();
          db = connection.db;
          console.log('[auth.config.ts] Successfully connected to database. DB Name:', db.databaseName);
        } catch (dbConnectError: any) {
          console.error('[auth.config.ts] CRITICAL: Database connection FAILED during authorize:', dbConnectError.message);
          console.error('[auth.config.ts] DB Connect Error Stack:', dbConnectError.stack);
          return null; 
        }

        let userDoc: UserDocument | null = null;
        try {
          console.log('[auth.config.ts] Searching for user in database with email:', email);
          userDoc = await db.collection<UserDocument>('users').findOne({ email });
        } catch (dbFindError: any) {
          console.error('[auth.config.ts] CRITICAL: Error finding user in database:', dbFindError.message);
          console.error('[auth.config.ts] DB Find Error Stack:', dbFindError.stack);
          return null;
        }

        if (!userDoc) {
          console.log('[auth.config.ts] No user found for email:', email, '. Authentication failed.');
          return null;
        }
        console.log('[auth.config.ts] User found for email:', email, 'User ID:', userDoc._id.toString());

        if (!userDoc.hashedPassword) {
          console.log('[auth.config.ts] User found but NO HASHED PASSWORD for email:', email, '(User ID:', userDoc._id.toString(), '). Authentication failed.');
          return null;
        }
        console.log('[auth.config.ts] User has a hashed password.');

        let passwordsMatch = false;
        try {
          console.log('[auth.config.ts] Comparing passwords for user:', email);
          passwordsMatch = await bcrypt.compare(password, userDoc.hashedPassword);
          console.log('[auth.config.ts] Password comparison result for user', email, ':', passwordsMatch);
        } catch (bcryptError: any) {
          console.error('[auth.config.ts] CRITICAL: Error comparing passwords with bcrypt:', bcryptError.message);
          console.error('[auth.config.ts] BCrypt Error Stack:', bcryptError.stack);
          return null; 
        }

        if (passwordsMatch) {
          console.log('[auth.config.ts] Passwords match for user:', email, '(User ID:', userDoc._id.toString(), '). Authentication SUCCESS.');
          return {
            id: userDoc._id.toString(),
            email: userDoc.email,
            name: userDoc.name || null,
          };
        } else {
          console.log('[auth.config.ts] Passwords do NOT match for user:', email, '(User ID:', userDoc._id.toString(), '). Authentication failed.');
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
      if (user) { // User object is only passed on first sign-in
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      // console.log('[auth.config.ts] Session callback. Token:', token, 'Session:', session);
      if (session.user) {
        if (token.id) session.user.id = token.id as string;
        // name and email are usually populated by default if in token from jwt callback
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET, // Explicitly set
  trustHost: true, // Recommended for some environments, review for production if not using Vercel/Next.js standard hosting
  debug: process.env.NODE_ENV === 'development', // Enable NextAuth.js debug messages in development
} satisfies NextAuthConfig;
