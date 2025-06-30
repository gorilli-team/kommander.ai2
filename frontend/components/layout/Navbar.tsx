"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import KommanderIcon from '@/frontend/components/layout/KommanderIcon';
import UserProfileButton from '@/frontend/components/layout/UserProfileButton';
import ThemeToggle from '@/frontend/components/layout/ThemeToggle';

export default function Navbar() {
  const pathname = usePathname();
  const showProfile = pathname !== '/login';

  return (
    <header className="bg-background/95 backdrop-blur-sm border-b border-border h-16 px-4 relative">
      <div className="flex items-center justify-between h-full">
        {/* Logo centrato sopra la sidebar */}
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
          <Link href="/training" aria-label="Go to Training page" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <KommanderIcon />
          </Link>
        </div>
        
        {/* Titolo centrato */}
        <div className="flex-1 flex justify-center">
          <span className="text-xl font-bold text-primary">
            Kommander.ai
          </span>
        </div>
        
        {/* Controls a destra */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {showProfile && <UserProfileButton />}
        </div>
      </div>
    </header>
  );
}
