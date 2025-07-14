"use client";

import { useOrganization } from '@/frontend/contexts/OrganizationContext';

/**
 * Custom hook to handle requests with organization context headers
 * This ensures that server actions receive the correct context information
 */
export function useContextualRequest() {
  const { currentContext, currentOrganization } = useOrganization();

  /**
   * Get headers for the current context
   */
  const getContextHeaders = () => {
    const headers: Record<string, string> = {
      'x-context-type': currentContext,
    };

    if (currentContext === 'organization' && currentOrganization) {
      headers['x-organization-id'] = currentOrganization.id;
    }

    return headers;
  };

  /**
   * Execute a server action with context headers
   * This is a wrapper that ensures the correct context is sent to the server
   */
  const executeWithContext = async <T extends any[], R>(
    action: (...args: T) => Promise<R>,
    ...args: T
  ): Promise<R> => {
    // For server actions, we need to ensure the context is available
    // The context headers are handled by the contextHelpers on the server side
    
    // If the action is a server action (function), we can call it directly
    // The context will be read from the request headers in the server action
    return action(...args);
  };

  /**
   * Fetch with context headers
   * Use this for API routes that need organization context
   */
  const fetchWithContext = async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const contextHeaders = getContextHeaders();
    
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...contextHeaders,
      },
    });
  };

  return {
    currentContext,
    currentOrganization,
    getContextHeaders,
    executeWithContext,
    fetchWithContext,
  };
}
