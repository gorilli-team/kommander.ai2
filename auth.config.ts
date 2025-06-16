
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { LoginSchema } from '@/frontend/components/auth/AuthForm'; // Assuming AuthForm exports this
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
        const validatedFields = LoginSchema.safeParse(credentials);

        if (validatedFields.success) {
          const { email, password } = validatedFields.data;
          
          try {
            const { db } = await connectToDatabase();
            const user = await db.collection<UserDocument>('users').findOne({ email });

            if (!user || !user.hashedPassword) {
              console.log('[auth.config.ts] No user found or no hashed password for email:', email);
              return null;
            }
            
            const passwordsMatch = await bcrypt.compare(password, user.hashedPassword);

            if (passwordsMatch) {
              console.log('[auth.config.ts] Passwords match for user:', email);
              // Return a user object that will be encoded in the JWT
              return { id: user._id.toString(), email: user.email, name: user.name };
            } else {
              console.log('[auth.config.ts] Passwords do not match for user:', email);
            }
          } catch (dbError) {
            console.error('[auth.config.ts] Database error during authorization:', dbError);
            return null; // Or throw an error to display a generic message
          }
        }
        console.log('[auth.config.ts] Invalid credentials or validation failed.');
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
  trustHost: true, // Necessary for some environments, consider if needed for Firebase Studio
} satisfies NextAuthConfig;
