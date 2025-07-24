"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import KommanderIcon from '@/frontend/components/layout/KommanderIcon';
import UserProfileButton from '@/frontend/components/layout/UserProfileButton';
import ThemeToggle from '@/frontend/components/layout/ThemeToggle';
import ContextSwitcher from '@/frontend/components/layout/ContextSwitcher';

export default function Navbar() {
  const pathname = usePathname();
  const showProfile = pathname !== '/login';
  
  console.log('[Navbar] Rendering - pathname:', pathname, 'showProfile:', showProfile);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between bg-background py-3 pr-4">
      <Link href="/welcome" aria-label="Go to Welcome page" className="ml-4 flex w-14 justify-center">
        <KommanderIcon />
      </Link>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <ContextSwitcher />
        {showProfile && <UserProfileButton />}
      </div>
    </header>
  );
}
