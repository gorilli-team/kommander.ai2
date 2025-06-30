
"use client";

import React, { useState } from 'react';
import Sidebar from '@/frontend/components/layout/Sidebar';
import Navbar from '@/frontend/components/layout/Navbar';
import { usePathname } from 'next/navigation';
import { cn } from '@/frontend/lib/utils';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const showAuthElements = !['/login', '/signup'].includes(pathname);

  return (
    <div className="relative flex flex-col min-h-screen bg-background">
      {showAuthElements && <Navbar />}

      <div className="flex flex-1">
        {/* Sidebar */}
        {showAuthElements && (
          <div className="fixed left-4 top-4 z-30 flex flex-col items-start space-y-3">
            <Sidebar />
          </div>
        )}

        {/* Main content */}
        <main
          className={cn(
            "flex-1 overflow-y-auto transition-all duration-300",
            showAuthElements 
              ? "p-4 sm:p-6 lg:pl-20 xl:pl-24 2xl:pl-28"
              : "p-4 sm:p-6"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
