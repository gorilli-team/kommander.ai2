
import type { NextAuthConfig, User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { LoginSchema } from '@/frontend/lib/schemas/auth.schemas';
import { connectToDatabase } from '@/backend/lib/mongodb';
import bcrypt from 'bcryptjs';
import type { UserDocument } from '@/backend/schemas/user'; // Ensure this path is correct

export const authConfig = {
  pages: {
    signIn: '/login',
    // error: '/login', // Optionally, define an error page
  },
  providers: [
    Credentials({
      async authorize(credentials): Promise<User | null> {
        console.log('[auth.config.ts] Authorize function ENTERED. Credentials received:', 
          credentials ? { email: (credentials as any).email, hasPassword: !!(credentials as any).password } : 'null'
        );

        const validatedFields = LoginSchema.safeParse(credentials);

        if (validatedFields.success) {
          const { email, password } = validatedFields.data;
          console.log('[auth.config.ts] Credentials validated for email:', email);
          
          try {
            console.log('[auth.config.ts] Attempting to connect to database...');
            const { db } = await connectToDatabase(); // Ensure connectToDatabase doesn't throw unhandled errors
            console.log('[auth.config.ts] Successfully connected to database. Searching for user:', email);
            
            const userDoc = await db.collection<UserDocument>('users').findOne({ email });

            if (!userDoc) {
              console.log('[auth.config.ts] No user found for email:', email, '. Authorize FAILED (user not found).');
              return null; 
            }
            console.log('[auth.config.ts] User found for email:', email, 'User ID:', userDoc._id);

            if (!userDoc.hashedPassword) {
              console.log('[auth.config.ts] User found but no hashed password for email:', email, '(User ID:', userDoc._id, '). Authorize FAILED (no password).');
              return null; 
            }
            
            console.log('[auth.config.ts] Comparing passwords for user:', email);
            const passwordsMatch = await bcrypt.compare(password, userDoc.hashedPassword);

            if (passwordsMatch) {
              console.log('[auth.config.ts] Passwords match for user:', email, '(User ID:', userDoc._id, '). Authorize SUCCESS.');
              // Return a user object that NextAuth expects
              return { id: userDoc._id.toString(), email: userDoc.email, name: userDoc.name || null, image: null };
            } else {
              console.log('[auth.config.ts] Passwords do NOT match for user:', email, '(User ID:', userDoc._id, '). Authorize FAILED (password mismatch).');
              return null; 
            }
          } catch (dbError: any) {
            console.error('[auth.config.ts] CRITICAL DATABASE/AUTHORIZATION ERROR for email:', email, dbError);
            console.error('[auth.config.ts] Error Name:', dbError.name);
            console.error('[auth.config.ts] Error Message:', dbError.message);
            console.error('[auth.config.ts] Error Stack:', dbError.stack);
            console.log('[auth.config.ts] Authorize FAILED (database error).');
            return null; // Explicitly return null on database error
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
      // console.log('[auth.config.ts] JWT callback. User:', user, 'Token:', token);
      if (user) { // user object comes from authorize callback or OAuth provider
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        // token.picture = user.image; // if you want to pass image
      }
      return token;
    },
    async session({ session, token }) {
      // console.log('[auth.config.ts] Session callback. Token:', token, 'Session:', session);
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.email = token.email;
        // session.user.image = token.picture; // if you want to pass image
      }
      return session;
    },
  },
  cookies: { // Explicit cookie configuration might sometimes help with CSRF issues
    // csrfToken: { // Example, defaults are usually fine if AUTH_SECRET is strong
    //   name: process.env.NODE_ENV === 'production' ? '__Host-authjs.csrf-token' : 'authjs.csrf-token',
    //   options: {
    //     httpOnly: true,
    //     sameSite: 'lax',
    //     path: '/',
    //     secure: process.env.NODE_ENV === 'production',
    //   },
    // },
  },
  trustHost: true, // Important for development environments, especially with proxies or custom domains
  secret: process.env.AUTH_SECRET, // Explicitly set the secret
} satisfies NextAuthConfig;
