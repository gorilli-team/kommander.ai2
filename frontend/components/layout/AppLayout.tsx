
"use client";

import React from 'react';
import Sidebar from '@/frontend/components/layout/Sidebar';
import KommanderIcon from '@/frontend/components/layout/KommanderIcon';
import Link from 'next/link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="fixed left-4 top-8 z-30 flex flex-col items-start space-y-3">
        <div className="flex-shrink-0 w-16 flex justify-center">
          <Link href="/training" className="inline-flex items-center justify-center" aria-label="Go to Training page">
            <KommanderIcon />
          </Link>
        </div>
        <Sidebar />
      </div>
      <main className="flex-1 overflow-y-auto p-6 pl-[6rem] md:pl-[6.25rem] lg:pl-[6.5rem]">
        {children}
      </main>
    </div>
  );
}
