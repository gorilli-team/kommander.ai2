
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, MessageCircle, MessageSquare, BarChart3, Settings as SettingsIcon, Users, Shield, type LucideIcon } from 'lucide-react';
import { cn } from '@/frontend/lib/utils';
import React, { useMemo } from 'react';
import { useOrganization } from '@/frontend/contexts/OrganizationContext';

interface NavItem {
  href: string;
  label: string; 
  icon: LucideIcon;
  id: string; 
}

export default function Sidebar() {
  const pathname = usePathname();
  const { currentOrganization } = useOrganization();

  const navItems = useMemo<NavItem[]>(() => {
    const role = currentOrganization?.userRole;
    // For operator role, show a simplified navigation
    if (role === 'operator') {
      return [
        { href: '/operator-dashboard', label: 'Operator', icon: Shield, id: 'sidebar-operator' },
        { href: '/conversations', label: 'Conversazioni', icon: MessageSquare, id: 'sidebar-conversations' },
        { href: '/chatbot-trial', label: 'Prova Chatbot', icon: MessageCircle, id: 'sidebar-chatbot' },
      ];
    }
    // Default full nav
    return [
      { href: '/training', label: 'Addestramento', icon: BookOpen, id: 'sidebar-training' },
      { href: '/chatbot-trial', label: 'Prova Chatbot', icon: MessageCircle, id: 'sidebar-chatbot' },
      { href: '/conversations', label: 'Conversazioni', icon: MessageSquare, id: 'sidebar-conversations' },
      { href: '/analytics', label: 'Analytics', icon: BarChart3, id: 'sidebar-analytics' },
      { href: '/settings', label: 'Impostazioni', icon: SettingsIcon, id: 'sidebar-settings' },
      { href: '/team', label: 'Gestione Team', icon: Users, id: 'sidebar-team' },
    ];
  }, [currentOrganization?.userRole]);
  
  return (
    <div className="flex w-14 flex-col items-center justify-start"> 
      <article 
        className="w-full rounded-xl border border-border bg-card/95 backdrop-blur-sm p-1.5 shadow-lg"
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/');
          return (
            <Link href={item.href} key={item.id} passHref legacyBehavior={false} aria-label={item.label}>
              <label
                htmlFor={item.id}
                className={cn(
                  "relative flex h-10 w-full cursor-pointer items-center justify-center rounded-md p-2 ease-in-out duration-300 group mb-3 last:mb-0",
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
                    "h-4 w-4 ease-in-out duration-300", 
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
