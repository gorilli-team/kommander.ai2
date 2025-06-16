
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
 
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// Helper type for session user
export interface SessionUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}
