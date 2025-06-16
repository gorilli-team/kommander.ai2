
import type { NextAuthConfig } from 'next-auth';
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
      async authorize(credentials) {
        console.log('[auth.config.ts] Authorize function ENTERED. Credentials received:', 
          credentials ? { email: (credentials as any).email, hasPassword: !!(credentials as any).password } : 'null'
        );

        const validatedFields = LoginSchema.safeParse(credentials);

        if (validatedFields.success) {
          const { email, password } = validatedFields.data;
          console.log('[auth.config.ts] Credentials validated for email:', email);
          
          try {
            console.log('[auth.config.ts] Attempting to connect to database...');
            const { db } = await connectToDatabase(); 
            console.log('[auth.config.ts] Successfully connected to database. Searching for user:', email);
            
            const user = await db.collection<UserDocument>('users').findOne({ email });

            if (!user) {
              console.log('[auth.config.ts] No user found for email:', email, '. Authorize FAILED (user not found).');
              return null; 
            }
            console.log('[auth.config.ts] User found for email:', email, 'User ID:', user._id);

            if (!user.hashedPassword) {
              console.log('[auth.config.ts] User found but no hashed password for email:', email, '(User ID:', user._id, '). Authorize FAILED (no password).');
              return null; 
            }
            
            console.log('[auth.config.ts] Comparing passwords for user:', email);
            const passwordsMatch = await bcrypt.compare(password, user.hashedPassword);

            if (passwordsMatch) {
              console.log('[auth.config.ts] Passwords match for user:', email, '(User ID:', user._id, '). Authorize SUCCESS.');
              return { id: user._id.toString(), email: user.email, name: user.name };
            } else {
              console.log('[auth.config.ts] Passwords do NOT match for user:', email, '(User ID:', user._id, '). Authorize FAILED (password mismatch).');
              return null; 
            }
          } catch (dbError: any) {
            console.error('[auth.config.ts] CRITICAL DATABASE/AUTHORIZATION ERROR for email:', email, dbError);
            console.error('[auth.config.ts] Error Name:', dbError.name);
            console.error('[auth.config.ts] Error Message:', dbError.message);
            console.error('[auth.config.ts] Error Stack:', dbError.stack);
            console.log('[auth.config.ts] Authorize FAILED (database error).');
            return null; 
          }
        } else {
          console.log('[auth.config.ts] Invalid credentials (Zod validation failed):', validatedFields.error?.flatten().fieldErrors);
          console.log('[auth.config.ts] Authorize FAILED (validation).');
        }
        console.log('[auth.config.ts] Authorize function EXITING (default path - should ideally not be reached if logic is complete). Returning null.');
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
        token.id = user.id; 
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  trustHost: true, // Important for development environments
} satisfies NextAuthConfig;
