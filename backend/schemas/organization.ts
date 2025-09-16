import { z } from 'zod';
import { ObjectId } from 'mongodb';

// Roles supported across the app (includes external operator role)
export const UserRoleEnum = z.enum(['admin', 'manager', 'user', 'viewer', 'guest', 'operator']);
export type UserRoleType = z.infer<typeof UserRoleEnum>;

// Granular permission strings used across APIs and UI
export const PermissionEnum = z.enum([
  'read_organization',
  'manage_organization',
  'manage_members',
  'invite_users',
  'remove_users',
  'manage_billing',
  'access_analytics',
  'admin_access',
  'read_conversations',
  'write_conversations',
  'read_kb',
  'write_kb',
]);
export type PermissionType = z.infer<typeof PermissionEnum>;

// Basic Organization Schema (placeholder for future team management)
export const OrganizationSchema = z.object({
  _id: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  ownerId: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  isActive: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type OrganizationDocument = z.infer<typeof OrganizationSchema>;

// Organization member schema with extended roles
export const OrganizationMemberSchema = z.object({
  _id: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  organizationId: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  userId: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  role: UserRoleEnum.default('user'),
  permissions: z.array(PermissionEnum).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).default('active').optional(),
  invitedBy: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object').optional(),
  joinedAt: z.date().optional(),
  lastActiveAt: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type OrganizationMemberDocument = z.infer<typeof OrganizationMemberSchema>;

// Client-safe types
export type ClientOrganization = Omit<OrganizationDocument, '_id' | 'ownerId' | 'createdAt' | 'updatedAt'> & {
  id: string;
  ownerId: string;
  userRole?: UserRoleType;
  userPermissions?: PermissionType[];
  memberCount?: number;
  createdAt?: string;
  updatedAt?: string;
};
