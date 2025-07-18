
"use client";

import React, { useState } from 'react';
import Sidebar from '@/frontend/components/layout/Sidebar';
import Navbar from '@/frontend/components/layout/Navbar';
import { usePathname } from 'next/navigation';
import { cn } from '@/frontend/lib/utils';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const showAuthElements = !['/login', '/signup', '/reset-password'].includes(pathname);
  const isChatbotTrial = pathname === '/chatbot-trial';

  return (
    <div className={cn(
      "relative flex flex-col bg-background",
      isChatbotTrial ? "h-screen" : "min-h-screen"
    )}>
      {showAuthElements && <Navbar />}

      {/* Mobile sidebar overlay */}
      {showAuthElements && sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {showAuthElements && (
        <div className="fixed left-4 top-[4.5rem] z-30 flex flex-col items-start space-y-3">
          <Sidebar />
        </div>
      )}

      <main
        className={cn(
          "flex-1 transition-all duration-300",
          isChatbotTrial 
            ? "overflow-hidden" 
            : "overflow-y-auto",
          isChatbotTrial && showAuthElements
            ? "h-[calc(100vh-4rem)] lg:pl-[6rem] xl:pl-[6.25rem] 2xl:pl-[6.5rem] lg:pr-16"
            : isChatbotTrial 
            ? "h-screen"
            : !isChatbotTrial && showAuthElements 
            ? "p-4 sm:p-6 lg:pl-[6rem] xl:pl-[6.25rem] 2xl:pl-[6.5rem] lg:pr-16" 
            : !isChatbotTrial 
            ? "p-4 sm:p-6" 
            : ""
        )}
      >
        {children}
      </main>
    </div>
  );
}
