
import NextAuth from 'next-auth';
import { authConfig } from './auth.config'; // Assuming auth.config.ts is in the same root directory

console.log('[auth.ts] Initializing NextAuth with authConfig...');

if (!process.env.AUTH_SECRET) {
  // This check runs at build time and server start. The one in auth.config.ts runs when config is evaluated.
  console.error("[auth.ts] CRITICAL ERROR: AUTH_SECRET is not set in environment variables when auth.ts is evaluated. This will cause NextAuth to fail.");
}
if (!process.env.NEXTAUTH_URL) {
  console.warn("[auth.ts] WARNING: NEXTAUTH_URL is not set. This might lead to issues, especially in production or with OAuth providers.");
}

export const { 
  handlers, // Includes GET and POST handlers for /api/auth/*
  auth,     // For accessing session server-side (e.g., in Server Components, Route Handlers)
  signIn,   // For initiating sign-in flow (client or server-side)
  signOut   // For initiating sign-out flow (client or server-side)
} = NextAuth(authConfig);

// Optional: Define a more specific user type for your session if needed for type safety in your app
// This helps if you add custom properties to session.user via callbacks.
export interface SessionUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  // Add any other custom fields you expect in session.user
}
