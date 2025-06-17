
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// console.log('[auth.ts] Initializing NextAuth with authConfig...');
// console.log('[auth.ts] AUTH_SECRET (first few chars):', process.env.AUTH_SECRET?.substring(0,5));
// console.log('[auth.ts] NEXTAUTH_URL:', process.env.NEXTAUTH_URL);


if (!process.env.AUTH_SECRET) {
  console.error("[auth.ts] CRITICAL ERROR: AUTH_SECRET is not set in environment variables. NextAuth will fail.");
  // throw new Error("AUTH_SECRET is not set. This will cause NextAuth to fail."); // Optionally throw to halt execution
}
if (!process.env.NEXTAUTH_URL) {
  console.warn("[auth.ts] WARNING: NEXTAUTH_URL is not set. This might lead to issues, especially in production or with OAuth providers that require a callback URL.");
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
