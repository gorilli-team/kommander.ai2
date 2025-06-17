
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// console.log('[auth.ts] Initializing NextAuth with authConfig...');
// console.log('[auth.ts] AUTH_SECRET (first few chars from env):', process.env.AUTH_SECRET?.substring(0,5));
// console.log('[auth.ts] NEXTAUTH_URL (from env):', process.env.NEXTAUTH_URL);

if (!process.env.AUTH_SECRET) {
  console.error("[auth.ts] CRITICAL ERROR: AUTH_SECRET is not set in environment variables. NextAuth will fail.");
  // Optionally throw to halt execution during build/startup if AUTH_SECRET is missing
  // throw new Error("AUTH_SECRET is not set. This will cause NextAuth to fail."); 
} else if (process.env.AUTH_SECRET.length < 32) {
    console.warn("[auth.ts] WARNING: AUTH_SECRET is set but appears to be less than 32 characters long. This is not recommended for production security.");
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

// Define a more specific user type for your session if needed
export interface SessionUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  // Add any other custom fields you expect in the session user object
}
