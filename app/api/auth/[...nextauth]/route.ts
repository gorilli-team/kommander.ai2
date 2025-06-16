
import { handlers } from '../../../../auth'; // Ensure this relative path is correct to the root auth.ts
export const { GET, POST } = handlers;
// export const runtime = "edge"; // Consider if your auth providers are edge compatible if you enable this
