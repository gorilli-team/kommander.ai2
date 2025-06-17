
import NextAuth from 'next-auth';
import { authConfig } from './auth.config'; // Assuming auth.config.ts is in the root

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// Optional: Define a more specific user type for your session if needed
export interface SessionUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}
