
import type { NextAuthConfig, User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { LoginSchema } from '@/frontend/lib/schemas/auth.schemas';
import { connectToDatabase } from '@/backend/lib/mongodb';
import bcrypt from 'bcryptjs';
import type { UserDocument } from '@/backend/schemas/user';

console.log('[auth.config.ts] File loaded. Initializing NextAuth config.');

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
          return null;
        }

        if (passwordsMatch) {
          console.log('[auth.config.ts] Passwords match for user:', email, '(User ID:', userDoc._id.toString(), '). Authorize SUCCESS.');
          // Return the user object in the format NextAuth expects
          return { 
            id: userDoc._id.toString(), 
            email: userDoc.email, 
            name: userDoc.name || null, // Ensure name is null if undefined
            image: null // Or userDoc.image if you have it
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
      if (user && user.id) { 
        token.id = user.id;
      }
      // Persist name and email from user object to token if they exist
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
  cookies: {
    // Default cookie names and options are usually fine if AUTH_SECRET is strong and unique.
    // Explicitly defining them can sometimes help in complex proxy or domain setups.
    // For CSRF token cookie:
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
  trustHost: true, // Recommended for development, especially if behind a proxy or custom domain. For production, review carefully.
  // secret: process.env.AUTH_SECRET, // NextAuth v5 automatically picks this up from process.env.AUTH_SECRET
  // debug: process.env.NODE_ENV === 'development', // Enable debug logs in development
} satisfies NextAuthConfig;
