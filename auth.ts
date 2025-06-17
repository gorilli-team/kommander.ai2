
import NextAuth from 'next-auth';
import { authConfig } from './auth.config'; // Assuming auth.config.ts is in the root

console.log('[auth.ts] Initializing NextAuth with authConfig...');

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export interface SessionUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}
