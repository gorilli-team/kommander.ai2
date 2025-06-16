
import NextAuth from 'next-auth';
import { authConfig } from '../../../../auth.config'; // Adjusted path if auth.config.ts is in root

const handler = NextAuth(authConfig);

export { handler as GET, handler as POST };
// export const runtime = "edge"; // Consider if your auth providers are edge compatible
