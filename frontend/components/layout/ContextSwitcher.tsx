"use client";

import React from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useOrganization } from '@/frontend/contexts/OrganizationContext';
import { Button } from '@/frontend/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/frontend/components/ui/dropdown-menu';
import { ChevronDown, User, Users, Building } from 'lucide-react';

export default function ContextSwitcher() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const {
    currentContext,
    currentOrganization,
    organizations,
    switchToPersonal,
    switchToOrganization,
    isLoading,
    getCurrentContextName,
  } = useOrganization();

  // Don't show on login page or if user is not authenticated
  if (pathname === '/login' || !session?.user) {
    return null;
  }

  const currentName = getCurrentContextName();
  const isPersonal = currentContext === 'personal';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-3 py-2">
          {isPersonal ? (
            <User className="h-4 w-4" />
          ) : (
            <Building className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">{currentName}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* Personal Profile */}
        <DropdownMenuItem
          onClick={switchToPersonal}
          className={`flex items-center gap-2 p-3 cursor-pointer ${
            isPersonal ? 'bg-accent' : ''
          }`}
        >
          <User className="h-4 w-4" />
          <div className="flex flex-col">
            <span className="font-medium">Personal</span>
            <span className="text-xs text-muted-foreground">
              {session.user.email}
            </span>
          </div>
        </DropdownMenuItem>

        {/* Organizations */}
        {organizations.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Users className="h-3 w-3" />
                Organizations
              </div>
            </div>
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => switchToOrganization(org.id)}
                className={`flex items-center gap-2 p-3 cursor-pointer ${
                  currentOrganization?.id === org.id ? 'bg-accent' : ''
                }`}
              >
                <Building className="h-4 w-4" />
                <div className="flex flex-col">
                  <span className="font-medium">{org.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {org.role}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Loading state */}
        {isLoading && (
          <DropdownMenuItem disabled className="text-muted-foreground">
            Loading organizations...
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
