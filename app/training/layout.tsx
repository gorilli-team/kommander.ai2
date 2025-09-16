import { ReactNode } from 'react';
import { auth } from '@/frontend/auth';
import { redirect } from 'next/navigation';

export default async function TrainingLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role === 'operator') {
    redirect('/operator-dashboard');
  }
  return <>{children}</>;
}
