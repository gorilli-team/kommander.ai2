
import type { NextAuthConfig, User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { LoginSchema } from '@/frontend/lib/schemas/auth.schemas';
import { connectToDatabase } from '@/backend/lib/mongodb';
import bcrypt from 'bcryptjs';
import type { UserDocument } from '@/backend/schemas/user';

// TEMPORARY LOG FOR DEBUGGING - REMOVE IN PRODUCTION
console.log('[auth.config.ts] Initializing... Value of AUTH_SECRET being read by NextAuth config:', process.env.AUTH_SECRET);
console.log('[auth.config.ts] Value of NEXTAUTH_URL:', process.env.NEXTAUTH_URL);

export const authConfig = {
  pages: {
    signIn: '/login',
    // error: '/login', // You can uncomment and define an error page if needed
  },
  providers: [
    Credentials({
      async authorize(credentials): Promise<User | null> {
        console.log('[auth.config.ts] Authorize function ENTERED. Credentials received:', 
          credentials ? { email: (credentials as any).email, hasPassword: !!(credentials as any).password } : 'null'
        );

        const validatedFields = LoginSchema.safeParse(credentials);
        if (!validatedFields.success) {
          console.error('[auth.config.ts] Zod validation FAILED for credentials:', validatedFields.error?.flatten().fieldErrors);
          return null; // Validation failed
        }
        console.log('[auth.config.ts] Zod validation SUCCESS for credentials.');

        const { email, password } = validatedFields.data;
        console.log('[auth.config.ts] Credentials validated for email:', email);

        let db;
        try {
          console.log('[auth.config.ts] Attempting to connect to database...');
          const connection = await connectToDatabase();
          db = connection.db;
          console.log('[auth.config.ts] Successfully connected to database. DB Name:', db.databaseName);
        } catch (dbConnectError: any) {
          console.error('[auth.config.ts] CRITICAL: Database connection FAILED during authorize:', dbConnectError.message);
          console.error('[auth.config.ts] DB Connect Error Stack:', dbConnectError.stack);
          // Returning null here will lead to a generic credentials error on the client.
          // It's crucial to check server logs for this.
          return null; 
        }

        let userDoc: UserDocument | null = null;
        try {
          console.log('[auth.config.ts] Searching for user in database with email:', email);
          userDoc = await db.collection<UserDocument>('users').findOne({ email });
        } catch (dbFindError: any) {
          console.error('[auth.config.ts] CRITICAL: Error finding user in database:', dbFindError.message);
          console.error('[auth.config.ts] DB Find Error Stack:', dbFindError.stack);
          return null; // Error during DB query
        }

        if (!userDoc) {
          console.log('[auth.config.ts] No user found for email:', email, '. Authorize FAILED (user not found).');
          return null;
        }
        console.log('[auth.config.ts] User found for email:', email, 'User ID:', userDoc._id.toString(), 'Name:', userDoc.name);

        if (!userDoc.hashedPassword) {
          console.log('[auth.config.ts] User found but NO HASHED PASSWORD for email:', email, '(User ID:', userDoc._id.toString(), '). Authorize FAILED (no password).');
          return null;
        }
        console.log('[auth.config.ts] User has a hashed password.');

        let passwordsMatch = false;
        try {
          console.log('[auth.config.ts] Comparing passwords for user:', email);
          passwordsMatch = await bcrypt.compare(password, userDoc.hashedPassword);
          console.log('[auth.config.ts] Password comparison result:', passwordsMatch);
        } catch (bcryptError: any) {
          console.error('[auth.config.ts] CRITICAL: Error comparing passwords with bcrypt:', bcryptError.message);
          console.error('[auth.config.ts] Bcrypt Error Stack:', bcryptError.stack);
          return null; // Error during password comparison
        }

        if (passwordsMatch) {
          console.log('[auth.config.ts] Passwords match for user:', email, '(User ID:', userDoc._id.toString(), '). Authorize SUCCESS.');
          return { // This is the User object NextAuth expects
            id: userDoc._id.toString(),
            email: userDoc.email,
            name: userDoc.name || null,
            image: null, // Or userDoc.image if you implement it
          };
        } else {
          console.log('[auth.config.ts] Passwords do NOT match for user:', email, '(User ID:', userDoc._id.toString(), '). Authorize FAILED (password mismatch).');
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt', // Using JWT for session strategy
  },
  callbacks: {
    async jwt({ token, user }) {
      // console.log('[auth.config.ts] JWT callback. User:', user, 'Token:', token);
      if (user) { // user object is only passed on first sign-in
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        // token.picture = user.image; // If you have user images
      }
      return token;
    },
    async session({ session, token }) {
      // console.log('[auth.config.ts] Session callback. Token:', token, 'Session:', session);
      if (session.user) {
        if (token.id) session.user.id = token.id as string;
        if (token.name) session.user.name = token.name;
        if (token.email) session.user.email = token.email;
        // if (token.picture) session.user.image = token.picture as string | null;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET, // Explicitly set for clarity, NextAuth.js might infer it but being explicit is good.
  trustHost: true, // Important for development environments, especially with proxies or containers
  // cookies: {}, // Relying on NextAuth.js defaults unless specific overrides are needed for CSRF token names etc.
  debug: process.env.NODE_ENV === 'development', // Enable more verbose logging in development
} satisfies NextAuthConfig;
