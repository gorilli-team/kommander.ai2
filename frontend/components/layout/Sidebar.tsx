
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, MessageCircle, MessageSquare, type LucideIcon } from 'lucide-react';
import { cn } from '@/frontend/lib/utils';
import React from 'react';

interface NavItem {
  href: string;
  label: string; 
  icon: LucideIcon;
  id: string; 
}

const navItems: NavItem[] = [
  { href: '/training', label: 'Training', icon: BookOpen, id: 'sidebar-training' },
  { href: '/chatbot-trial', label: 'Chatbot Trial', icon: MessageCircle, id: 'sidebar-chatbot' },
  { href: '/conversations', label: 'Conversazioni', icon: MessageSquare, id: 'sidebar-conversations' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex w-16 flex-col items-center justify-start"> 
      <article 
        className="w-full rounded-2xl border border-border bg-card p-2 shadow-xl"
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/');
          return (
            <Link href={item.href} key={item.id} passHref legacyBehavior={false} aria-label={item.label}>
              <label
                htmlFor={item.id}
                className={cn(
                  "relative flex h-12 w-full cursor-pointer items-center justify-center rounded-lg p-3 ease-in-out duration-300 group mb-4 last:mb-0",
                  "text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground",
                  isActive ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" : "border-transparent"
                )}
                title={item.label}
              >
                <input
                  className="peer/expand hidden" 
                  type="radio"
                  name="sidebar-nav-path" 
                  id={item.id}
                  checked={isActive}
                  readOnly 
                  value={item.href}
                />
                <item.icon
                  className={cn(
                    "h-5 w-5 ease-in-out duration-300", 
                    "group-hover:scale-110", 
                    isActive ? "scale-110" : "" 
                  )}
                  aria-hidden="true"
                />
              </label>
            </Link>
          );
        })}
      </article>
    </div>
  );
}
