
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { LoginSchema } from '@/frontend/lib/schemas/auth.schemas';
import { connectToDatabase } from '@/backend/lib/mongodb';
import bcrypt from 'bcryptjs';
import type { UserDocument } from '@/backend/schemas/user';

export const authConfig = {
  pages: {
    signIn: '/login',
    // error: '/login', // Optionally, define an error page
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        console.log('[auth.config.ts] Authorize function called with credentials:', credentials);
        const validatedFields = LoginSchema.safeParse(credentials);

        if (validatedFields.success) {
          const { email, password } = validatedFields.data;
          console.log('[auth.config.ts] Credentials validated for email:', email);
          
          try {
            console.log('[auth.config.ts] Attempting to connect to database...');
            const { db } = await connectToDatabase();
            console.log('[auth.config.ts] Connected to database. Searching for user:', email);
            const user = await db.collection<UserDocument>('users').findOne({ email });

            if (!user) {
              console.log('[auth.config.ts] No user found for email:', email);
              return null;
            }
            if (!user.hashedPassword) {
              console.log('[auth.config.ts] User found but no hashed password for email:', email);
              return null;
            }
            
            console.log('[auth.config.ts] User found. Comparing passwords for user:', email);
            const passwordsMatch = await bcrypt.compare(password, user.hashedPassword);

            if (passwordsMatch) {
              console.log('[auth.config.ts] Passwords match for user:', email);
              // Return a user object that will be encoded in the JWT
              return { id: user._id.toString(), email: user.email, name: user.name };
            } else {
              console.log('[auth.config.ts] Passwords do not match for user:', email);
              return null; // Explicitly return null if passwords don't match
            }
          } catch (dbError: any) {
            console.error('[auth.config.ts] Database error during authorization:', dbError.message, dbError.stack);
            return null; // Or throw an error to display a generic message
          }
        } else {
          console.log('[auth.config.ts] Invalid credentials or Zod validation failed:', validatedFields.error?.flatten());
        }
        console.log('[auth.config.ts] Authorization failed, returning null.');
        return null;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id; // Add user ID to the JWT token
        // token.name = user.name; // If you have name
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        // session.user.name = token.name as string; // If you have name
      }
      return session;
    },
  },
  // secret: process.env.AUTH_SECRET, // Handled by NextAuth automatically if AUTH_SECRET is set
  trustHost: true, // Necessary for some environments, consider if needed
} satisfies NextAuthConfig;
