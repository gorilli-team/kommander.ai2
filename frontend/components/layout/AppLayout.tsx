
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
      {showAuthElements && (
        <Navbar 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />
      )}

      {/* Mobile sidebar overlay */}
      {showAuthElements && sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {showAuthElements && (
        <div className={cn(
          "fixed left-4 top-[calc(5rem+1px)] z-50 flex flex-col items-start space-y-3 transition-transform duration-300",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          <Sidebar onItemClick={() => setSidebarOpen(false)} />
        </div>
      )}

      <main
        className={cn(
          "flex-1 overflow-y-auto transition-all duration-300",
          showAuthElements 
            ? "pt-[calc(5rem+1px)] p-4 sm:p-6 lg:pl-[6rem] xl:pl-[6.25rem] 2xl:pl-[6.5rem] lg:pr-16" 
            : "p-4 sm:p-6"
        )}
      >
        {children}
      </main>
    </div>
  );
}
