
// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/auth'; // Ensure this path points to your root auth.ts
export const { GET, POST } = handlers;

// export const runtime = "edge"; // Only if all your providers and DB are edge-compatible. For Credentials, 'nodejs' (default) is safer.
