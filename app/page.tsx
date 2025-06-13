
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/training');
  // return null; // redirect will prevent rendering
}
