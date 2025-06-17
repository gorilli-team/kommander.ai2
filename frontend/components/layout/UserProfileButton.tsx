
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/frontend/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/frontend/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar';
import { UserCircle, LogOut } from 'lucide-react'; // Settings icon removed
import { signOut, useSession } from 'next-auth/react';

export default function UserProfileButton() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  // Profile handling temporarily removed to simplify
  // const handleProfile = () => {
  //   router.push('/profile');
  // };

  if (status === 'loading') {
    return <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 animate-pulse bg-muted/50"></Button>;
  }

  if (status === 'unauthenticated') {
    // This case should ideally not be hit if AppLayout correctly hides this button on /login
    // But as a fallback:
    return (
      <Button onClick={() => router.push('/login')} variant="outline" size="sm">
        Log In
      </Button>
    );
  }
  
  const userInitial = session?.user?.name?.charAt(0).toUpperCase() || session?.user?.email?.charAt(0).toUpperCase() || <UserCircle className="h-7 w-7 text-muted-foreground" />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
          <Avatar className="h-9 w-9">
            <AvatarImage src={session?.user?.image || `https://placehold.co/40x40/1a56db/FFFFFF.png?text=${userInitial}`} data-ai-hint="avatar placeholder" />
            <AvatarFallback>
              {userInitial}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{session?.user?.name || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {session?.user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* Profile link temporarily removed
        <DropdownMenuItem onClick={handleProfile} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        */}
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
