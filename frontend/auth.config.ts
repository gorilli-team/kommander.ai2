
import type { NextAuthConfig, User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import Microsoft from 'next-auth/providers/microsoft-entra-id';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { LoginSchema } from '@/frontend/lib/schemas/auth.schemas';
import { connectToDatabase } from '@/backend/lib/mongodb';
import bcrypt from 'bcryptjs';
import type { UserDocument } from '@/backend/schemas/user';
import { MongoClient } from 'mongodb';

const MOCK_USER_ID = 'mock-user-id-for-arbi';
const MOCK_USER_EMAIL = 'arbi@gorilli.io';
const MOCK_USER_NAME = 'Arbi Gorilli (Bypass)';

const mockUser: User = {
  id: MOCK_USER_ID,
  email: MOCK_USER_EMAIL,
  name: MOCK_USER_NAME,
};

// Create MongoDB client for the adapter
const client = new MongoClient(process.env.MONGODB_URI!);
const clientPromise = Promise.resolve(client);

export const authConfig = {
  adapter: MongoDBAdapter(clientPromise),
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt', // Necessario per far funzionare sia OAuth che Credentials
  },
  providers: [
    // Google({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    Microsoft({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
    }),
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
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      if (process.env.BYPASS_AUTH === 'true') {
        return true;
      }
      
      // Per provider OAuth, controlliamo se esiste già un account con la stessa email
      if (account?.provider !== 'credentials' && user.email) {
        try {
          const connection = await connectToDatabase();
          const db = connection.db;
          
          // Controlla se esiste già un utente con questa email
          const existingUser = await db.collection('users').findOne({ email: user.email });
          
          if (existingUser) {
            console.log(`[auth.config.ts] OAuth login: Found existing user with email ${user.email}, linking accounts`);
            // L'adapter MongoDB gestirà automaticamente il linking degli account
            return true;
          } else {
            console.log(`[auth.config.ts] OAuth login: Creating new user with email ${user.email}`);
            return true;
          }
        } catch (error) {
          console.error('[auth.config.ts] Error during OAuth signIn callback:', error);
          return false;
        }
      }
      
      return true;
    },
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
