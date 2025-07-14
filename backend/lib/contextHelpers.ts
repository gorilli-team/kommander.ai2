import { headers } from 'next/headers';

/**
 * Get the current context (personal or organization) from request headers
 * This should be set by the frontend when making requests
 */
export async function getCurrentContext(): Promise<'personal' | 'organization'> {
  const headersList = headers();
  const context = headersList.get('x-context-type');
  return context === 'organization' ? 'organization' : 'personal';
}

/**
 * Get the current organization ID from request headers
 * This should be set by the frontend when making requests in organization context
 */
export async function getCurrentOrganizationId(): Promise<string | null> {
  const headersList = headers();
  return headersList.get('x-organization-id');
}

/**
 * Get the current context information
 * Returns both context type and organization ID if applicable
 */
export async function getContextInfo(): Promise<{
  context: 'personal' | 'organization';
  organizationId: string | null;
}> {
  const context = await getCurrentContext();
  const organizationId = context === 'organization' ? await getCurrentOrganizationId() : null;
  
  return {
    context,
    organizationId,
  };
}
