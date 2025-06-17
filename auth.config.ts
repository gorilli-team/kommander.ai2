
import type { NextAuthConfig, User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { LoginSchema } from '@/frontend/lib/schemas/auth.schemas';
import { connectToDatabase } from '@/backend/lib/mongodb';
import bcrypt from 'bcryptjs';
import type { UserDocument } from '@/backend/schemas/user';

// TEMPORARY LOG FOR DEBUGGING - REMOVE AFTER CHECKING SERVER LOGS
console.log('[auth.config.ts] Evaluating auth.config.ts module...');
console.log('[auth.config.ts] Raw process.env.AUTH_SECRET:', process.env.AUTH_SECRET);
if (process.env.AUTH_SECRET) {
  console.log('[auth.config.ts] Length of AUTH_SECRET:', process.env.AUTH_SECRET.length);
  if (process.env.AUTH_SECRET.includes('"') || process.env.AUTH_SECRET.includes("'")) {
    console.warn('[auth.config.ts] CRITICAL WARNING: AUTH_SECRET appears to contain quotes! This will likely cause CSRF/session errors. Remove them from your .env.local file.');
  }
  if (process.env.AUTH_SECRET.includes(' ') || process.env.AUTH_SECRET.includes('\n')) {
    console.warn('[auth.config.ts] CRITICAL WARNING: AUTH_SECRET appears to contain spaces or newlines! This is incorrect.');
  }
} else {
  console.error('[auth.config.ts] CRITICAL ERROR: AUTH_SECRET is undefined or empty! Set it in .env.local.');
}
console.log('[auth.config.ts] Raw process.env.NEXTAUTH_URL:', process.env.NEXTAUTH_URL);


export const authConfig = {
  pages: {
    signIn: '/login', // Redirect users to /login if they try to access protected pages
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
          console.error('[auth.config.ts] CRITICAL: Database connection FAILED during authorize:', dbConnectError.message, dbConnectError.stack);
          return null; // Cannot connect to DB
        }

        let userDoc: UserDocument | null = null;
        try {
          console.log('[auth.config.ts] Searching for user in database with email:', email);
          userDoc = await db.collection<UserDocument>('users').findOne({ email });
        } catch (dbFindError: any) {
          console.error('[auth.config.ts] CRITICAL: Error finding user in database:', dbFindError.message, dbFindError.stack);
          return null; // DB query error
        }

        if (!userDoc) {
          console.log('[auth.config.ts] No user found for email:', email, '. Authorize FAILED (user not found).');
          return null; // User not found
        }
        console.log('[auth.config.ts] User found for email:', email, 'User ID:', userDoc._id.toString(), 'Name:', userDoc.name);

        if (!userDoc.hashedPassword) {
          console.log('[auth.config.ts] User found but NO HASHED PASSWORD for email:', email, '(User ID:', userDoc._id.toString(), '). Authorize FAILED (no password).');
          return null; // User exists but has no password set (e.g. OAuth only account)
        }

        let passwordsMatch = false;
        try {
          console.log('[auth.config.ts] Comparing passwords for user:', email);
          passwordsMatch = await bcrypt.compare(password, userDoc.hashedPassword);
        } catch (bcryptError: any)          console.error('[auth.config.ts] CRITICAL: Error comparing passwords with bcrypt:', bcryptError.message, bcryptError.stack);
          return null; // Error during password comparison
        }

        if (passwordsMatch) {
          console.log('[auth.config.ts] Passwords match for user:', email, '(User ID:', userDoc._id.toString(), '). Authorize SUCCESS.');
          // Return the user object that NextAuth expects
          return {
            id: userDoc._id.toString(),
            email: userDoc.email,
            name: userDoc.name || null, // Ensure name is null if undefined
            image: null // Or userDoc.image if you have it
          };
        } else {
          console.log('[auth.config.ts] Passwords do NOT match for user:', email, '(User ID:', userDoc._id.toString(), '). Authorize FAILED (password mismatch).');
          return null; // Passwords don't match
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
      if (user && user.id) { // user object is available on initial sign in
        token.id = user.id;
      }
      if (user?.name) token.name = user.name;
      if (user?.email) token.email = user.email;
      // if (user?.image) token.picture = user.image; // if you use images
      return token;
    },
    async session({ session, token }) {
      // console.log('[auth.config.ts] Session callback. Token:', token, 'Session:', session);
      if (session.user) {
        if (token.id) session.user.id = token.id as string;
        if (token.name) session.user.name = token.name;
        if (token.email) session.user.email = token.email;
        // if (token.picture) session.user.image = token.picture; // if you use images
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET, // Explicitly set for clarity, though NextAuth.js picks it up
  trustHost: true, // Often recommended for development, especially if behind a proxy.
  // Using default cookie settings by not specifying the cookies block explicitly,
  // NextAuth.js should infer secure based on NEXTAUTH_URL (http -> secure: false for dev)
  // and set SameSite=lax for CSRF token cookie.
} satisfies NextAuthConfig;
