"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

export interface Organization {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
}

export interface OrganizationContextType {
  // Current context
  currentContext: 'personal' | 'organization';
  currentOrganization: Organization | null;
  
  // Available organizations
  organizations: Organization[];
  
  // Actions
  switchToPersonal: () => void;
  switchToOrganization: (organizationId: string) => void;
  
  // Loading state
  isLoading: boolean;
  
  // Helper methods
  isPersonalContext: () => boolean;
  isOrganizationContext: () => boolean;
  getCurrentContextId: () => string | null;
  getCurrentContextName: () => string;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

interface OrganizationProviderProps {
  children: ReactNode;
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const { data: session } = useSession();
  const [currentContext, setCurrentContext] = useState<'personal' | 'organization'>('personal');
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load user's organizations
  useEffect(() => {
    if (session?.user?.id) {
      loadUserOrganizations();
    }
  }, [session?.user?.id]);

  const loadUserOrganizations = async () => {
    if (!session?.user?.id) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/organizations');
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchToPersonal = () => {
    setCurrentContext('personal');
    setCurrentOrganization(null);
    localStorage.setItem('currentContext', 'personal');
    localStorage.removeItem('currentOrganizationId');
  };

  const switchToOrganization = (organizationId: string) => {
    const organization = organizations.find(org => org.id === organizationId);
    if (organization) {
      setCurrentContext('organization');
      setCurrentOrganization(organization);
      localStorage.setItem('currentContext', 'organization');
      localStorage.setItem('currentOrganizationId', organizationId);
    }
  };

  // Restore context from localStorage on mount
  useEffect(() => {
    const savedContext = localStorage.getItem('currentContext');
    const savedOrganizationId = localStorage.getItem('currentOrganizationId');
    
    if (savedContext === 'organization' && savedOrganizationId && organizations.length > 0) {
      const savedOrganization = organizations.find(org => org.id === savedOrganizationId);
      if (savedOrganization) {
        setCurrentContext('organization');
        setCurrentOrganization(savedOrganization);
      }
    }
  }, [organizations]);

  const isPersonalContext = () => currentContext === 'personal';
  const isOrganizationContext = () => currentContext === 'organization';
  
  const getCurrentContextId = () => {
    if (currentContext === 'personal') {
      return session?.user?.id || null;
    }
    return currentOrganization?.id || null;
  };

  const getCurrentContextName = () => {
    if (currentContext === 'personal') {
      return session?.user?.name || 'Personal';
    }
    return currentOrganization?.name || 'Organization';
  };

  const value: OrganizationContextType = {
    currentContext,
    currentOrganization,
    organizations,
    switchToPersonal,
    switchToOrganization,
    isLoading,
    isPersonalContext,
    isOrganizationContext,
    getCurrentContextId,
    getCurrentContextName,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
