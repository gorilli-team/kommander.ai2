
import type { NextAuthConfig, User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { LoginSchema } from '@/frontend/lib/schemas/auth.schemas';
import { connectToDatabase } from '@/backend/lib/mongodb';
import bcrypt from 'bcryptjs';
import type { UserDocument } from '@/backend/schemas/user';

// Log all environment variables that Auth.js might use (for debugging purposes)
// In a real production environment, be careful about logging sensitive information.
console.log('[auth.config.ts] Initializing...');
console.log('[auth.config.ts] NEXTAUTH_URL from env:', process.env.NEXTAUTH_URL);
console.log('[auth.config.ts] AUTH_SECRET from env is set:', !!process.env.AUTH_SECRET);


export const authConfig = {
  pages: {
    signIn: '/login',
    // error: '/login', // Optionally define an error page
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
          return null; // Cannot proceed without DB
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

        let passwordsMatch = false;
        try {
          console.log('[auth.config.ts] Comparing passwords for user:', email);
          passwordsMatch = await bcrypt.compare(password, userDoc.hashedPassword);
        } catch (bcryptError: any) {
          console.error('[auth.config.ts] CRITICAL: Error comparing passwords with bcrypt:', bcryptError.message);
          console.error('[auth.config.ts] Bcrypt Error Stack:', bcryptError.stack);
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
    async jwt({ token, user, account, profile }) {
      // console.log('[auth.config.ts] JWT callback. User:', user, 'Token:', token, 'Account:', account);
      if (user && user.id) { // Persist the user ID from User object to the token
        token.id = user.id;
      }
      if (user?.name) token.name = user.name;
      if (user?.email) token.email = user.email;
      // if (user?.image) token.picture = user.image; // if you have images
      return token;
    },
    async session({ session, token }) {
      // console.log('[auth.config.ts] Session callback. Token:', token, 'Session:', session);
      if (session.user) {
        if (token.id) session.user.id = token.id as string;
        if (token.name) session.user.name = token.name;
        if (token.email) session.user.email = token.email;
        // if (token.picture) session.user.image = token.picture as string | null; // if you have images
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET, // Crucial for JWT signing and cookie encryption
  trustHost: true, // Recommended for development environments, especially with proxies or containers
  // cookies: {}, // Relying on NextAuth.js defaults unless specific overrides are needed
  debug: process.env.NODE_ENV === 'development', // Enable more verbose logging in development
} satisfies NextAuthConfig;
