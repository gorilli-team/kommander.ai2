
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

console.log('[auth.ts] Initializing NextAuth with authConfig...');
if (!process.env.AUTH_SECRET) {
  console.error("[auth.ts] CRITICAL ERROR: AUTH_SECRET is not set in environment variables when auth.ts is evaluated. This will cause NextAuth to fail or behave unpredictably.");
}
if (!process.env.NEXTAUTH_URL) {
  console.warn("[auth.ts] WARNING: NEXTAUTH_URL is not set. This might lead to issues, especially in production or with OAuth providers.");
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// Define a more specific user type for your session if needed for type safety in your app
export interface SessionUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  // Add any other custom fields you expect in session.user
}
