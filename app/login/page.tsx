
"use client";
import AuthForm from '@/frontend/components/auth/AuthForm';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/frontend/components/ui/skeleton';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Check for NEXT_PUBLIC_BYPASS_AUTH first for client-side, then BYPASS_AUTH as fallback
  const isBypassAuthActive = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true' || process.env.BYPASS_AUTH === 'true';

  if (isBypassAuthActive) {
    useEffect(() => {
      console.log('[LoginPage] BYPASS_AUTH or NEXT_PUBLIC_BYPASS_AUTH is active, redirecting to /training');
      router.replace('/training');
    }, [router]);

    return ( // Show skeleton while redirecting
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-10 w-3/4 mx-auto" />
          <Skeleton className="h-8 w-1/2 mx-auto" />
          <p className="text-center text-muted-foreground">Bypassing login, redirecting...</p>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (status === 'authenticated' && !isBypassAuthActive) { // Only redirect if not bypassing
      router.replace('/training');
    }
  }, [status, router, isBypassAuthActive]);

  if (status === 'loading' || (status === 'authenticated' && !isBypassAuthActive)) {
    // Show a loading skeleton or a blank page while redirecting for normal auth
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-10 w-3/4 mx-auto" />
          <Skeleton className="h-8 w-1/2 mx-auto" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  // If not bypassing and not authenticated, show AuthForm
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <AuthForm />
    </div>
  );
}
