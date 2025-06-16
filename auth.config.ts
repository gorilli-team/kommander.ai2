
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { LoginSchema } from '@/frontend/lib/schemas/auth.schemas';
import { connectToDatabase } from '@/backend/lib/mongodb';
import bcrypt from 'bcryptjs';
import type { UserDocument } from '@/backend/schemas/user';

export const authConfig = {
  pages: {
    signIn: '/login',
    // error: '/login', // Optionally, define an error page for auth errors
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
            const { db } = await connectToDatabase(); // This can throw an error
            console.log('[auth.config.ts] Successfully connected to database. Searching for user:', email);
            
            const user = await db.collection<UserDocument>('users').findOne({ email });

            if (!user) {
              console.log('[auth.config.ts] No user found for email:', email);
              return null; // User not found
            }
            console.log('[auth.config.ts] User found for email:', email, 'User ID:', user._id);

            if (!user.hashedPassword) {
              console.log('[auth.config.ts] User found but no hashed password for email:', email, '(User ID:', user._id, ')');
              return null; // User exists but has no password (should not happen in normal flow)
            }
            
            console.log('[auth.config.ts] Comparing passwords for user:', email);
            const passwordsMatch = await bcrypt.compare(password, user.hashedPassword);

            if (passwordsMatch) {
              console.log('[auth.config.ts] Passwords match for user:', email, '(User ID:', user._id, ')');
              // Return a user object that will be encoded in the JWT
              return { id: user._id.toString(), email: user.email, name: user.name };
            } else {
              console.log('[auth.config.ts] Passwords do NOT match for user:', email, '(User ID:', user._id, ')');
              return null; // Passwords don't match
            }
          } catch (dbError: any) {
            console.error('[auth.config.ts] CRITICAL DATABASE/AUTHORIZATION ERROR for email:', email, dbError);
            console.error('[auth.config.ts] Error Name:', dbError.name);
            console.error('[auth.config.ts] Error Message:', dbError.message);
            console.error('[auth.config.ts] Error Stack:', dbError.stack);
            return null; // Or throw an error to display a generic message to the user via error page
          }
        } else {
          console.log('[auth.config.ts] Invalid credentials (Zod validation failed):', validatedFields.error?.flatten().fieldErrors);
        }
        console.log('[auth.config.ts] Authorization failed (did not meet conditions or error occurred), returning null.');
        return null;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // console.log('[auth.config.ts] JWT callback:', { token, user, account, profile });
      if (user) {
        token.id = user.id; 
        // if (user.name) token.name = user.name; // Already handled by NextAuth default
      }
      return token;
    },
    async session({ session, token }) {
      // console.log('[auth.config.ts] Session callback:', { session, token });
      if (session.user && token.id) {
        session.user.id = token.id as string;
        // if (token.name) session.user.name = token.name as string; // Already handled
      }
      return session;
    },
  },
  // secret: process.env.AUTH_SECRET, // Handled by NextAuth automatically if AUTH_SECRET is set
  trustHost: true, // Necessary for some environments, generally safe for localhost
} satisfies NextAuthConfig;
