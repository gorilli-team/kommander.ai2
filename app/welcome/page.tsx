"use client";

import React from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import WelcomeDashboard from '@/frontend/components/welcome/WelcomeDashboard';

export default function WelcomePage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    redirect('/login');
  }

  return (
    <div className="container mx-auto py-6 space-y-8 max-w-7xl">
      <WelcomeDashboard user={session?.user} />
    </div>
  );
}
