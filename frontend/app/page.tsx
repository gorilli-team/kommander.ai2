
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/training'); // Redirect to training page by default, or login if not authenticated (handled by middleware/auth config)
}
