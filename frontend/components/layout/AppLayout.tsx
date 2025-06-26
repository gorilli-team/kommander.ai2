
"use client";

import React from 'react';
import Sidebar from '@/frontend/components/layout/Sidebar';
import Navbar from '@/frontend/components/layout/Navbar';
import { usePathname } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showAuthElements = pathname !== '/login'; 

  return (
    <div className="relative flex flex-col min-h-screen bg-background">
      <Navbar />

      {showAuthElements && (
        <div className="fixed left-4 top-24 z-30 flex flex-col items-start space-y-3">
          <Sidebar />
        </div>
      )}

      <main className={`flex-1 overflow-y-auto p-6 pt-20 ${showAuthElements ? 'pl-[6rem] md:pl-[6.25rem] lg:pl-[6.5rem] pr-[4rem]' : ''}`}>
        {children}
      </main>
    </div>
  );
}
