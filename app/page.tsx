
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/welcome'); // Redirect to welcome page by default
}
