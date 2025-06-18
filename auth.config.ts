
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
          // You might want to throw a specific error type or return an object that AuthForm can interpret
          // For NextAuth, returning null or throwing an error results in a generic credentials error.
          // To provide a custom message, you'd typically handle this in the signIn call on the client.
          // However, for security, just denying access is standard.
          // Throwing an error with a specific message can sometimes be caught by NextAuth and displayed.
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
            // emailVerified: userDoc.emailVerified // Can be added if needed in session/token
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
    async jwt({ token, user }) {
      if (user) { 
        token.id = user.id;
        // token.emailVerified = (user as any).emailVerified; // Pass custom props from authorize user object
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        // (session.user as any).emailVerified = token.emailVerified;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  debug: process.env.NODE_ENV === 'development',
} satisfies NextAuthConfig;
