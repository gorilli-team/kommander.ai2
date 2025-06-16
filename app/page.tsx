
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/login'); // Redirect to login page by default
}
