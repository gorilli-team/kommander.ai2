
import type { NextAuthConfig, User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { LoginSchema } from '@/frontend/lib/schemas/auth.schemas'; // Path should be correct with @/frontend alias
import { connectToDatabase } from '@/backend/lib/mongodb'; // Path should be correct with @/backend alias
import bcrypt from 'bcryptjs';
import type { UserDocument } from '@/backend/schemas/user'; // Path should be correct with @/backend alias


export const authConfig = {
  pages: {
    signIn: '/login', // This will map to frontend/app/login/page.tsx
  },
  providers: [
    Credentials({
      async authorize(credentials): Promise<User | null> {
        console.log('[frontend/auth.config.ts] Authorize function called. Validating credentials...');

        const validatedFields = LoginSchema.safeParse(credentials);
        if (!validatedFields.success) {
          console.error('[frontend/auth.config.ts] Zod validation failed for credentials:', validatedFields.error.flatten().fieldErrors);
          return null;
        }
        console.log('[frontend/auth.config.ts] Credentials validated by Zod successfully.');

        const { email, password } = validatedFields.data;
        console.log('[frontend/auth.config.ts] Attempting to authenticate user:', email);

        let db;
        try {
          console.log('[frontend/auth.config.ts] Attempting to connect to database...');
          const connection = await connectToDatabase();
          db = connection.db;
          console.log('[frontend/auth.config.ts] Successfully connected to database. DB Name:', db.databaseName);
        } catch (dbConnectError: any) {
          console.error('[frontend/auth.config.ts] CRITICAL: Database connection FAILED during authorize:', dbConnectError.message);
          console.error('[frontend/auth.config.ts] DB Connect Error Stack:', dbConnectError.stack);
          return null; 
        }

        let userDoc: UserDocument | null = null;
        try {
          console.log('[frontend/auth.config.ts] Searching for user in database with email:', email);
          userDoc = await db.collection<UserDocument>('users').findOne({ email });
        } catch (dbFindError: any) {
          console.error('[frontend/auth.config.ts] CRITICAL: Error finding user in database:', dbFindError.message);
          console.error('[frontend/auth.config.ts] DB Find Error Stack:', dbFindError.stack);
          return null;
        }

        if (!userDoc) {
          console.log('[frontend/auth.config.ts] No user found for email:', email, '. Authentication failed.');
          return null;
        }
        console.log('[frontend/auth.config.ts] User found for email:', email, 'User ID:', userDoc._id.toString());

        if (!userDoc.hashedPassword) {
          console.log('[frontend/auth.config.ts] User found but NO HASHED PASSWORD for email:', email, '(User ID:', userDoc._id.toString(), '). Authentication failed.');
          return null;
        }
        console.log('[frontend/auth.config.ts] User has a hashed password.');

        let passwordsMatch = false;
        try {
          console.log('[frontend/auth.config.ts] Comparing passwords for user:', email);
          passwordsMatch = await bcrypt.compare(password, userDoc.hashedPassword);
          console.log('[frontend/auth.config.ts] Password comparison result for user', email, ':', passwordsMatch);
        } catch (bcryptError: any) {
          console.error('[frontend/auth.config.ts] CRITICAL: Error comparing passwords with bcrypt:', bcryptError.message);
          console.error('[frontend/auth.config.ts] BCrypt Error Stack:', bcryptError.stack);
          return null; 
        }

        if (passwordsMatch) {
          console.log('[frontend/auth.config.ts] Passwords match for user:', email, '(User ID:', userDoc._id.toString(), '). Authentication SUCCESS.');
          return {
            id: userDoc._id.toString(),
            email: userDoc.email,
            name: userDoc.name || null,
          };
        } else {
          console.log('[frontend/auth.config.ts] Passwords do NOT match for user:', email, '(User ID:', userDoc._id.toString(), '). Authentication failed.');
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
      if (user) { 
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.id) session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
  trustHost: true, 
  debug: process.env.NODE_ENV === 'development',
} satisfies NextAuthConfig;
