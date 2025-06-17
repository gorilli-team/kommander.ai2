
"use client";

import React from 'react';
import Sidebar from '@/frontend/components/layout/Sidebar';
import KommanderIcon from '@/frontend/components/layout/KommanderIcon';
import UserProfileButton from '@/frontend/components/layout/UserProfileButton'; 
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showAuthElements = pathname !== '/login'; 

  return (
    <div className="relative min-h-screen bg-background">
      {showAuthElements && (
        <div className="fixed left-4 top-8 z-30 flex flex-col items-start space-y-3">
          <div className="flex-shrink-0 w-16 flex justify-center">
            <Link href="/training" className="inline-flex items-center justify-center" aria-label="Go to Training page">
              <KommanderIcon />
            </Link>
          </div>
          <Sidebar />
        </div>
      )}

      {showAuthElements && (
        <div className="fixed right-6 top-8 z-30">
          <UserProfileButton />
        </div>
      )}
      
      <main className={`flex-1 overflow-y-auto p-6 ${showAuthElements ? 'pl-[6rem] md:pl-[6.25rem] lg:pl-[6.5rem] pr-[4rem]' : ''}`}>
        {children}
      </main>
    </div>
  );
}
