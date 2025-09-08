import { z } from 'zod';
import { ObjectId } from 'mongodb';

// Role and permission types
export type UserRoleType = 'owner' | 'admin' | 'manager' | 'user' | 'viewer' | 'guest';

export type PermissionType =
  | 'read_organization'
  | 'manage_members'
  | 'invite_users'
  | 'remove_users'
  | 'manage_invitations'
  | 'manage_organization'
  | 'manage_billing'
  | 'access_analytics'
  | 'admin_access';

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRoleType, PermissionType[]> = {
  owner: [
    'admin_access',
    'manage_organization',
    'manage_members',
    'invite_users',
    'remove_users',
    'manage_invitations',
    'manage_billing',
    'access_analytics',
    'read_organization',
  ],
  admin: [
    'admin_access',
    'manage_organization',
    'manage_members',
    'invite_users',
    'remove_users',
    'manage_invitations',
    'access_analytics',
    'read_organization',
  ],
  manager: [
    'manage_members',
    'invite_users',
    'access_analytics',
    'read_organization',
  ],
  user: [
    'read_organization',
  ],
  viewer: [
    'read_organization',
  ],
  guest: [],
};

// Organization Schema (rich)
export const OrganizationSchema = z.object({
  _id: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  ownerId: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  logo: z.string().url().optional(),
  website: z.string().url().optional(),
  settings: z
    .object({
      allowPublicJoin: z.boolean().optional(),
      requireApproval: z.boolean().optional(),
      defaultRole: z.enum(['admin', 'manager', 'user', 'viewer', 'guest']).optional(),
      maxMembers: z.number().optional(),
      allowedDomains: z.array(z.string()).optional(),
    })
    .optional(),
  plan: z.enum(['free', 'pro', 'enterprise']).optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().optional(),
});

export type OrganizationDocument = z.infer<typeof OrganizationSchema>;

// Organization Member Schema (rich)
export const OrganizationMemberSchema = z.object({
  _id: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  organizationId: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  userId: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  role: z.enum(['admin', 'manager', 'user', 'viewer', 'guest']).default('user'),
  permissions: z
    .array(
      z.enum([
        'read_organization',
        'manage_members',
        'invite_users',
        'remove_users',
        'manage_invitations',
        'manage_organization',
        'manage_billing',
        'access_analytics',
        'admin_access',
      ])
    )
    .optional(),
  customPermissions: z
    .array(
      z.enum([
        'read_organization',
        'manage_members',
        'invite_users',
        'remove_users',
        'manage_invitations',
        'manage_organization',
        'manage_billing',
        'access_analytics',
        'admin_access',
      ])
    )
    .optional(),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  invitedBy: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object').optional(),
  invitedAt: z.date().optional(),
  joinedAt: z.date().optional(),
  lastActiveAt: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type OrganizationMemberDocument = z.infer<typeof OrganizationMemberSchema>;

// Invitation Schema
export const InvitationSchema = z.object({
  _id: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  organizationId: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'user', 'viewer', 'guest']).default('user'),
  permissions: z
    .array(
      z.enum([
        'read_organization',
        'manage_members',
        'invite_users',
        'remove_users',
        'manage_invitations',
        'manage_organization',
        'manage_billing',
        'access_analytics',
        'admin_access',
      ])
    )
    .optional(),
  token: z.string(),
  status: z.enum(['pending', 'accepted', 'revoked', 'cancelled']).default('pending'),
  message: z.string().optional(),
  invitedBy: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  expiresAt: z.date(),
  acceptedAt: z.date().optional(),
  acceptedBy: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object').optional(),
  revokedBy: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object').optional(),
});

export type InvitationDocument = z.infer<typeof InvitationSchema>;

// Minimal user profile doc used in member aggregation
export interface UserProfileDocument {
  _id: ObjectId;
  userId: ObjectId;
  avatar?: string;
}

// Client-safe types
export type ClientOrganization = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  settings?: Record<string, unknown> & {
    allowPublicJoin?: boolean;
    requireApproval?: boolean;
    defaultRole?: 'admin' | 'manager' | 'user' | 'viewer' | 'guest';
    maxMembers?: number;
    allowedDomains?: string[];
  };
  ownerId: string;
  plan?: 'free' | 'pro' | 'enterprise' | string;
  isActive: boolean;
  memberCount: number;
  userRole?: UserRoleType;
  userPermissions?: PermissionType[];
  createdAt?: string;
  updatedAt?: string;
};

export type ClientOrganizationMember = {
  id: string;
  organizationId: string;
  userId: string;
  role: Exclude<UserRoleType, 'owner'>;
  permissions?: PermissionType[];
  customPermissions?: PermissionType[];
  status: 'active' | 'inactive' | 'suspended';
  invitedBy?: string;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    avatar?: string | null;
  };
  createdAt?: string;
  updatedAt?: string;
  invitedAt?: string;
  joinedAt?: string;
  lastActiveAt?: string;
};

export type ClientInvitation = {
  id: string;
  organizationId: string;
  email: string;
  role: Exclude<UserRoleType, 'owner'>;
  permissions?: PermissionType[];
  token: string;
  status: 'pending' | 'accepted' | 'revoked' | 'cancelled';
  message?: string;
  invitedBy: string;
  organization?: {
    id: string;
    name: string;
    logo?: string;
  };
  invitedByUser?: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
  createdAt?: string;
  updatedAt?: string;
  expiresAt: string;
  acceptedAt?: string;
};
