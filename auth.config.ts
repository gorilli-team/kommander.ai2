
import type { NextAuthConfig, User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { LoginSchema } from '@/frontend/lib/schemas/auth.schemas';
import { connectToDatabase } from '@/backend/lib/mongodb';
import bcrypt from 'bcryptjs';
import type { UserDocument } from '@/backend/schemas/user';

// Temporary log to check if AUTH_SECRET is loaded at module evaluation
console.log('[auth.config.ts] Evaluating auth.config.ts module...');
if (process.env.AUTH_SECRET) {
  console.log('[auth.config.ts] AUTH_SECRET is loaded, length:', process.env.AUTH_SECRET.length);
} else {
  console.error('[auth.config.ts] CRITICAL ERROR: AUTH_SECRET is undefined or empty at module evaluation!');
}
if (process.env.NEXTAUTH_URL) {
  console.log('[auth.config.ts] NEXTAUTH_URL is loaded:', process.env.NEXTAUTH_URL);
} else {
  console.warn('[auth.config.ts] WARNING: NEXTAUTH_URL is undefined or empty at module evaluation.');
}


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

        if (!process.env.AUTH_SECRET) {
          console.error('[auth.config.ts] CRITICAL: AUTH_SECRET is not available within authorize function. This will cause CSRF/session errors.');
          // Consider throwing an error or returning null immediately if AUTH_SECRET is vital here for some pre-check (though usually not directly used in authorize)
        }

        const validatedFields = LoginSchema.safeParse(credentials);

        if (!validatedFields.success) {
          console.error('[auth.config.ts] Zod validation FAILED for credentials:', validatedFields.error?.flatten().fieldErrors);
          return null;
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
          console.error('[auth.config.ts] CRITICAL: Database connection FAILED during authorize:', dbConnectError.message, dbConnectError.stack);
          return null;
        }

        let userDoc: UserDocument | null = null;
        try {
          console.log('[auth.config.ts] Searching for user in database with email:', email);
          userDoc = await db.collection<UserDocument>('users').findOne({ email });
        } catch (dbFindError: any) {
          console.error('[auth.config.ts] CRITICAL: Error finding user in database:', dbFindError.message, dbFindError.stack);
          return null;
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

        let passwordsMatch = false;
        try {
          console.log('[auth.config.ts] Comparing passwords for user:', email);
          passwordsMatch = await bcrypt.compare(password, userDoc.hashedPassword);
        } catch (bcryptError: any) {
          console.error('[auth.config.ts] CRITICAL: Error comparing passwords with bcrypt:', bcryptError.message, bcryptError.stack);
          return null; // Error during password comparison
        }

        if (passwordsMatch) {
          console.log('[auth.config.ts] Passwords match for user:', email, '(User ID:', userDoc._id.toString(), '). Authorize SUCCESS.');
          return {
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
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      // console.log('[auth.config.ts] JWT callback. User:', user, 'Token:', token);
      if (user && user.id) {
        token.id = user.id;
      }
      if (user?.name) token.name = user.name;
      if (user?.email) token.email = user.email;
      return token;
    },
    async session({ session, token }) {
      // console.log('[auth.config.ts] Session callback. Token:', token, 'Session:', session);
      if (session.user) {
        if (token.id) session.user.id = token.id as string;
        if (token.name) session.user.name = token.name;
        if (token.email) session.user.email = token.email;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
  trustHost: true, // Recommended for development environments
  // cookies: {}, // Explicitly setting cookies (even if empty) can sometimes influence behavior.
                 // Removing this for now to rely on NextAuth.js defaults which should be fine
                 // if AUTH_SECRET and NEXTAUTH_URL are correctly set.
} satisfies NextAuthConfig;
