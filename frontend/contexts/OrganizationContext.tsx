"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  userRole: 'owner' | 'admin' | 'manager' | 'user' | 'viewer' | 'guest' | 'operator';
  userPermissions?: string[];
  memberCount?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
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
    
    console.log('[OrganizationContext] Loading organizations for user:', session.user.id);
    setIsLoading(true);
    try {
      const response = await fetch('/api/organizations');
      console.log('[OrganizationContext] API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[OrganizationContext] API response data:', data);
        
        // The API returns an array directly, not wrapped in an object
        const orgs = Array.isArray(data) ? data : (data.organizations || []);
        console.log('[OrganizationContext] Setting organizations:', orgs);
        // Map the API response to our Organization interface
        const mappedOrgs = orgs.map((org: any) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          description: org.description,
          logo: org.logo,
          userRole: org.userRole,
          userPermissions: org.userPermissions,
          memberCount: org.memberCount,
          isActive: org.isActive,
          createdAt: org.createdAt,
          updatedAt: org.updatedAt
        }));
        setOrganizations(mappedOrgs);
      } else {
        console.error('[OrganizationContext] API error:', response.status, await response.text());
      }
    } catch (error) {
      console.error('[OrganizationContext] Error loading organizations:', error);
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
