
import NextAuth from 'next-auth';
import { authConfig } from '../../../../auth.config'; // Adjusted path to be relative to the app directory root

const handler = NextAuth(authConfig);

export { handler as GET, handler as POST };
// export const runtime = "edge"; // Consider if your auth providers are edge compatible
// For Credentials provider, runtime should generally be 'nodejs' (default) not 'edge'.
