import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { organizationService } from './organizationService';
import { PermissionType, UserRoleType } from '../schemas/organization';

export interface AuthContext {
  userId: string;
  userRole?: UserRoleType;
  userPermissions?: PermissionType[];
  organizationId?: string;
}

export interface AuthMiddlewareOptions {
  requireAuth?: boolean;
  requiredPermission?: PermissionType;
  requiredRole?: UserRoleType;
  organizationIdParam?: string; // Parameter name for organization ID (e.g., 'id', 'orgId')
  allowOwner?: boolean; // Allow if user is organization owner
}

/**
 * Authentication and authorization middleware
 */
export async function withAuth(
  request: NextRequest,
  options: AuthMiddlewareOptions = {},
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const {
    requireAuth = true,
    requiredPermission,
    requiredRole,
    organizationIdParam = 'id',
    allowOwner = false
  } = options;

  try {
    // Check authentication
    if (requireAuth) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      const userId = session.user.id;
      let userRole: UserRoleType | undefined;
      let userPermissions: PermissionType[] | undefined;
      let organizationId: string | undefined;

      // Extract organization ID from URL parameters
      if (organizationIdParam) {
        const url = new URL(request.url);
        const pathSegments = url.pathname.split('/');
        const orgIdIndex = pathSegments.findIndex(segment => 
          segment === 'organizations' || segment === 'orgs'
        );
        
        if (orgIdIndex !== -1 && pathSegments[orgIdIndex + 1]) {
          organizationId = pathSegments[orgIdIndex + 1];
        }
      }

      // Check organization-level permissions
      if (organizationId && (requiredPermission || requiredRole)) {
        // Get user's role and permissions in this organization
        const organization = await organizationService.getOrganization(organizationId, userId);
        
        if (!organization) {
          return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        userRole = organization.userRole;
        userPermissions = organization.userPermissions;

        // Check if user is organization owner (if allowOwner is true)
        if (allowOwner && organization.ownerId === userId) {
          // Owner has all permissions, continue
        } else {
          // Check required role
          if (requiredRole && userRole !== requiredRole) {
            // Allow higher roles (admin > manager > user > viewer > guest)
            const roleHierarchy: Record<UserRoleType, number> = {
              admin: 5,
              manager: 4,
              user: 3,
              viewer: 2,
              guest: 1
            };

            const userRoleLevel = roleHierarchy[userRole || 'guest'];
            const requiredRoleLevel = roleHierarchy[requiredRole];

            if (userRoleLevel < requiredRoleLevel) {
              return NextResponse.json({ 
                error: `Insufficient role. Required: ${requiredRole}, current: ${userRole}` 
              }, { status: 403 });
            }
          }

          // Check required permission
          if (requiredPermission && userPermissions && !userPermissions.includes(requiredPermission)) {
            return NextResponse.json({ 
              error: `Missing required permission: ${requiredPermission}` 
            }, { status: 403 });
          }
        }
      }

      // Create auth context
      const context: AuthContext = {
        userId,
        userRole,
        userPermissions,
        organizationId
      };

      return await handler(request, context);
    } else {
      // No auth required, call handler with empty context
      return await handler(request, { userId: '' });
    }

  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Helper function to check if user has specific permission
 */
export async function hasPermission(
  userId: string,
  organizationId: string,
  permission: PermissionType
): Promise<boolean> {
  return await organizationService.hasPermission(userId, organizationId, permission);
}

/**
 * Helper function to get user's role in organization
 */
export async function getUserRole(
  userId: string,
  organizationId: string
): Promise<UserRoleType | null> {
  const organization = await organizationService.getOrganization(organizationId, userId);
  return organization?.userRole || null;
}

/**
 * Helper function to check if user is organization owner
 */
export async function isOrganizationOwner(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const organization = await organizationService.getOrganization(organizationId);
  return organization?.ownerId === userId;
}

/**
 * Higher-order function to create protected API routes
 */
export function createProtectedRoute(
  options: AuthMiddlewareOptions,
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
) {
  return async (request: NextRequest, routeParams?: any) => {
    return withAuth(request, options, (req, context) => handler(req, context));
  };
}

/**
 * Role-based route protection decorators
 */
export const requireAdmin = (handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) =>
  createProtectedRoute({ requiredRole: 'admin' }, handler);

export const requireManager = (handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) =>
  createProtectedRoute({ requiredRole: 'manager' }, handler);

export const requireUser = (handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) =>
  createProtectedRoute({ requiredRole: 'user' }, handler);

/**
 * Permission-based route protection decorators
 */
export const requirePermission = (permission: PermissionType) =>
  (handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) =>
    createProtectedRoute({ requiredPermission: permission }, handler);

export const requireManageMembers = requirePermission('manage_members');
export const requireInviteUsers = requirePermission('invite_users');
export const requireRemoveUsers = requirePermission('remove_users');
export const requireManageBilling = requirePermission('manage_billing');
export const requireAccessAnalytics = requirePermission('access_analytics');
export const requireAdminAccess = requirePermission('admin_access');

/**
 * Utility to extract organization ID from request URL
 */
export function extractOrganizationId(request: NextRequest, paramName: string = 'id'): string | null {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  
  // Look for organizations in the path
  const orgIndex = pathSegments.findIndex(segment => 
    segment === 'organizations' || segment === 'orgs'
  );
  
  if (orgIndex !== -1 && pathSegments[orgIndex + 1]) {
    return pathSegments[orgIndex + 1];
  }
  
  return null;
}
