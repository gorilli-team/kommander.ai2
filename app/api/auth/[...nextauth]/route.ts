
// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/auth'; // Ensure this path points to your root auth.ts
export const { GET, POST } = handlers;

// For Credentials provider, 'nodejs' (default) runtime is generally safer.
// 'edge' runtime might have limitations with certain Node.js APIs or database drivers.
// export const runtime = "edge";
