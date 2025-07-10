"use client";

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { CheckCircle2, Building2, Users, ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';

function InviteSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const orgName = searchParams.get('orgName') || 'the organization';
  const role = searchParams.get('role') || 'member';
  
  useEffect(() => {
    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      router.push('/team');
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-full w-fit">
            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground mb-1">
            Welcome to the Team! 🎉
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Success Message */}
            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
              <Building2 className="h-8 w-8 mx-auto mb-3 text-green-600 dark:text-green-400" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Invitation Accepted Successfully!
              </h3>
              <p className="text-sm text-muted-foreground">
                You are now a <span className="font-medium text-foreground">{role}</span> of{' '}
                <span className="font-medium text-foreground">{orgName}</span>
              </p>
            </div>

            {/* Next Steps */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">What's next?</h4>
              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Explore your team</p>
                    <p className="text-xs text-muted-foreground">
                      View team members and collaborate
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Set up your profile</p>
                    <p className="text-xs text-muted-foreground">
                      Complete your organization profile
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Link href="/team">
                <Button className="w-full">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Go to Team Dashboard
                </Button>
              </Link>
              
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Redirecting automatically in 5 seconds...
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function InviteSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-lg shadow-xl">
          <CardContent className="p-6">
            <div className="text-center">
              <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p>Loading success page...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <InviteSuccessContent />
    </Suspense>
  );
}
