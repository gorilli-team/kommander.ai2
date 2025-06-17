
import { handlers } from '@/auth'; // Assumes auth.ts is in the project root
export const { GET, POST } = handlers;

// For Credentials provider, 'nodejs' (default) runtime is generally safer.
// 'edge' runtime might have limitations with certain Node.js APIs or database drivers.
// export const runtime = "edge";
