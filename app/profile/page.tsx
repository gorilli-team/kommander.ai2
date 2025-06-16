
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/frontend/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar';
import { UserCircle, LogOut, ShieldCheck } from 'lucide-react';
import { Skeleton } from '@/frontend/components/ui/skeleton';

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=/profile');
    }
  }, [status, router]);

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  if (status === 'loading' || !session) {
    return (
      <div className="container mx-auto py-8 flex justify-center">
        <Card className="w-full max-w-lg shadow-xl">
          <CardHeader className="items-center text-center">
            <Skeleton className="h-20 w-20 rounded-full mb-4" />
            <Skeleton className="h-7 w-40 mb-1" />
            <Skeleton className="h-5 w-60" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-4 w-full" />
            </div>
          </CardContent>
          <CardFooter className="flex justify-center border-t pt-6">
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  const user = {
    name: session.user?.name || 'Kommander User',
    email: session.user?.email || 'No email provided',
    avatarUrl: session.user?.image || `https://placehold.co/80x80/1a56db/FFFFFF.png?text=${session.user?.name?.charAt(0) || session.user?.email?.charAt(0) || 'U'}`,
    bio: 'Exploring the Kommander.ai platform.', // Placeholder bio
  };
  const userInitial = user.name?.charAt(0).toUpperCase() || <UserCircle className="h-16 w-16 text-muted-foreground" />;


  return (
    <div className="container mx-auto py-8 flex justify-center">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="items-center text-center">
          <Avatar className="h-20 w-20 mb-4">
            <AvatarImage src={user.avatarUrl} alt={user.name || "User"} data-ai-hint="profile picture" />
            <AvatarFallback>
              {userInitial}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl font-bold">{user.name}</CardTitle>
          <CardDescription className="text-muted-foreground">{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Bio</h3>
            <p className="text-sm text-foreground">{user.bio}</p>
          </div>
           <div className="flex items-center space-x-2 pt-2">
              <ShieldCheck className="h-5 w-5 text-green-500" />
              <p className="text-sm text-muted-foreground">Account Verified</p>
            </div>
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-6">
          <Button variant="destructive" onClick={handleLogout} className="w-full sm:w-auto">
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
