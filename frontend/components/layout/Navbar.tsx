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
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-background py-3 pr-4 border-b border-border/20">
      <Link href="/training" aria-label="Go to Training page" className="ml-4 flex w-14 justify-center">
        <KommanderIcon />
      </Link>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        {showProfile && <UserProfileButton />}
      </div>
    </header>
  );
}
