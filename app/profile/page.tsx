// app/profile/page.tsx
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/frontend/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar';
import { UserCircle, LogOut } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();

  const handleLogout = () => {
    // In a real app, you'd clear session/token here
    router.push('/login');
  };

  // Placeholder user data
  const user = {
    name: 'Arbi Shehu',
    email: 'arbi@gorilli.io',
    avatarUrl: 'https://placehold.co/80x80/1a56db/FFFFFF.png?text=A',
    bio: 'Passionate Blockchain Engineer at Gorilli. Exploring the future of decentralized technologies.',
  };

  return (
    <div className="container mx-auto py-8 flex justify-center">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="items-center text-center">
          <Avatar className="h-20 w-20 mb-4">
            <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="profile picture" />
            <AvatarFallback>
              <UserCircle className="h-16 w-16 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl font-bold">{user.name}</CardTitle>
          <CardDescription className="text-muted-foreground">{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Bio</h3>
            <p className="text-sm text-foreground">{user.bio || 'No bio provided.'}</p>
          </div>
          {/* Add more profile fields here if needed */}
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
