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
    <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-background/95 backdrop-blur-sm border-b border-border h-16 px-4">
      <Link href="/training" aria-label="Go to Training page" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <KommanderIcon />
        <span className="text-xl font-bold text-primary hidden sm:block">
          Kommander.ai
        </span>
      </Link>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        {showProfile && <UserProfileButton />}
      </div>
    </header>
  );
}
