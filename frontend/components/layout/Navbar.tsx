"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import KommanderIcon from '@/frontend/components/layout/KommanderIcon';
import UserProfileButton from '@/frontend/components/layout/UserProfileButton';
import ThemeToggle from '@/frontend/components/layout/ThemeToggle';
import { Button } from '@/frontend/components/ui/button';
import { Menu, X } from 'lucide-react';
import { cn } from '@/frontend/lib/utils';

interface NavbarProps {
  onMenuClick?: () => void;
  sidebarOpen?: boolean;
}

export default function Navbar({ onMenuClick, sidebarOpen }: NavbarProps) {
  const pathname = usePathname();
  const showProfile = pathname !== '/login';

  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-background/95 backdrop-blur-sm border-b border-border py-2 sm:py-3 px-3 sm:px-4">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile menu button */}
        {showProfile && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8 sm:h-9 sm:w-9"
            onClick={onMenuClick}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? (
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </Button>
        )}
        
        <Link 
          href="/training" 
          aria-label="Go to Training page" 
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12">
            <KommanderIcon />
          </div>
          <span className="hidden sm:block text-lg font-semibold text-primary">
            Kommander.ai
          </span>
        </Link>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4">
        <ThemeToggle />
        {showProfile && <UserProfileButton />}
      </div>
    </header>
  );
}
