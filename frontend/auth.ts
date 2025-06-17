
import NextAuth from 'next-auth';
import { authConfig } from '@/frontend/auth.config';

if (!process.env.AUTH_SECRET) {
  console.error("[frontend/auth.ts] CRITICAL ERROR: AUTH_SECRET is not set in environment variables. NextAuth will fail.");
} else if (process.env.AUTH_SECRET.length < 32) {
    console.warn("[frontend/auth.ts] WARNING: AUTH_SECRET is set but appears to be less than 32 characters long. This is not recommended for production security.");
}

if (!process.env.NEXTAUTH_URL) {
  console.warn("[frontend/auth.ts] WARNING: NEXTAUTH_URL is not set. This might lead to issues, especially in production or with OAuth providers that require a callback URL.");
}


export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig);

export interface SessionUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}
