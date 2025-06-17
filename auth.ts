
import NextAuth from 'next-auth';
import { authConfig } from './auth.config'; // Assuming auth.config.ts is in the root

console.log('[auth.ts] Initializing NextAuth with authConfig...');
if (!process.env.AUTH_SECRET) {
  console.error("[auth.ts] CRITICAL ERROR: AUTH_SECRET is not set in environment variables at the time auth.ts is evaluated. This will cause NextAuth to fail.");
}


export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// Define a more specific user type for your session if needed
export interface SessionUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  // Add any other custom fields you expect in session.user
}
