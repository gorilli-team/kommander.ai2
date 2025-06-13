// src/components/layout/AppLayout.tsx
"use client";

import React from 'react';
import Sidebar from './Sidebar';
import KommanderIcon from './KommanderIcon';
import Link from 'next/link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Fixed container for Logo and Floating Sidebar */}
      <div className="fixed left-4 top-8 z-30 flex flex-col items-start space-y-3"> {/* Changed top-4 to top-8, items-center to items-start, space-y-4 to space-y-3 */}
        {/* Logo Area - Centered above sidebar */}
        <div className="flex-shrink-0 w-16 flex justify-center"> {/* Added w-16 and flex justify-center */}
          <Link href="/training" className="inline-flex items-center justify-center" aria-label="Go to Training page">
            <KommanderIcon />
          </Link>
        </div>
        
        {/* Floating Sidebar Component */}
        <Sidebar />
      </div>

      {/* Main Content Area */}
      {/* Adjusted padding-left based on new calculations */}
      <main className="flex-1 overflow-y-auto p-6 pl-[6rem] md:pl-[6.25rem] lg:pl-[6.5rem]">
        {children}
      </main>
    </div>
  );
}
