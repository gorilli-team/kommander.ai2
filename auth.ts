
import NextAuth from 'next-auth';
import { authConfig } from './auth.config'; // Assuming auth.config.ts is in the root
 
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// Helper type for session user, if needed beyond default NextAuth types
export interface SessionUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}
