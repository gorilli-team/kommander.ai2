import { z } from 'zod';
import { ObjectId } from 'mongodb';

// Enum per ruoli
export const UserRole = z.enum(['admin', 'manager', 'user', 'viewer', 'guest']);
export type UserRoleType = z.infer<typeof UserRole>;

// Enum per permessi
export const Permission = z.enum([
  'read_organization',
  'write_organization', 
  'manage_members',
  'invite_users',
  'manage_invitations',
  'remove_users',
  'manage_billing',
  'access_analytics',
  'manage_chatbots',
  'read_conversations',
  'write_conversations',
  'delete_conversations',
  'manage_settings',
  'manage_organization',
  'admin_access'
]);
export type PermissionType = z.infer<typeof Permission>;

// Schema Organization
export const OrganizationSchema = z.object({
  _id: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  logo: z.string().optional(),
  website: z.string().url().optional(),
  settings: z.object({
    allowPublicJoin: z.boolean().default(false),
    requireApproval: z.boolean().default(true),
    defaultRole: UserRole.default('user'),
    maxMembers: z.number().default(10),
    allowedDomains: z.array(z.string()).optional(),
  }).optional(),
  ownerId: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  plan: z.enum(['free', 'pro', 'enterprise']).default('free'),
  isActive: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type OrganizationDocument = z.infer<typeof OrganizationSchema>;

// Schema Organization Member
export const OrganizationMemberSchema = z.object({
  _id: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  organizationId: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  userId: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  role: UserRole,
  permissions: z.array(Permission).optional(),
  customPermissions: z.array(z.string()).optional(), // Per permessi custom futuri
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  invitedAt: z.date().optional(),
  joinedAt: z.date().optional(),
  invitedBy: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object').optional(),
  lastActiveAt: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type OrganizationMemberDocument = z.infer<typeof OrganizationMemberSchema>;

// Schema Invitation
export const InvitationSchema = z.object({
  _id: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  organizationId: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  email: z.string().email(),
  role: UserRole,
  permissions: z.array(Permission).optional(),
  token: z.string(),
  status: z.enum(['pending', 'accepted', 'rejected', 'expired', 'cancelled', 'revoked']).default('pending'),
  message: z.string().optional(),
  expiresAt: z.date(),
  invitedBy: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  acceptedAt: z.date().optional(),
  acceptedBy: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object').optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type InvitationDocument = z.infer<typeof InvitationSchema>;

// Schema User Profile esteso
export const UserProfileSchema = z.object({
  _id: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  userId: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  avatar: z.string().optional(),
  bio: z.string().max(500).optional(),
  title: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  phone: z.string().optional(),
  timezone: z.string().default('UTC'),
  language: z.string().default('en'),
  preferences: z.object({
    emailNotifications: z.boolean().default(true),
    pushNotifications: z.boolean().default(true),
    weeklyDigest: z.boolean().default(true),
    theme: z.enum(['light', 'dark', 'system']).default('system'),
  }).optional(),
  socialLinks: z.object({
    linkedin: z.string().optional(),
    twitter: z.string().optional(),
    github: z.string().optional(),
  }).optional(),
  isPublic: z.boolean().default(false),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type UserProfileDocument = z.infer<typeof UserProfileSchema>;

// Default permissions per ruolo
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRoleType, PermissionType[]> = {
  admin: [
    'read_organization',
    'write_organization',
    'manage_members',
    'invite_users',
    'manage_invitations',
    'remove_users',
    'manage_billing',
    'access_analytics',
    'manage_chatbots',
    'read_conversations',
    'write_conversations',
    'delete_conversations',
    'manage_settings',
    'manage_organization',
    'admin_access'
  ],
  manager: [
    'read_organization',
    'manage_members',
    'invite_users',
    'manage_invitations',
    'access_analytics',
    'manage_chatbots',
    'read_conversations',
    'write_conversations',
    'manage_settings'
  ],
  user: [
    'read_organization',
    'manage_chatbots',
    'read_conversations',
    'write_conversations'
  ],
  viewer: [
    'read_organization',
    'read_conversations'
  ],
  guest: [
    'read_organization'
  ]
};

// Client-safe types (senza ObjectId)
export type ClientOrganization = Omit<OrganizationDocument, '_id' | 'ownerId' | 'createdAt' | 'updatedAt'> & {
  id: string;
  ownerId: string;
  createdAt?: string;
  updatedAt?: string;
  memberCount?: number;
  userRole?: UserRoleType;
  userPermissions?: PermissionType[];
};

export type ClientOrganizationMember = Omit<OrganizationMemberDocument, '_id' | 'organizationId' | 'userId' | 'invitedBy' | 'createdAt' | 'updatedAt' | 'invitedAt' | 'joinedAt' | 'lastActiveAt'> & {
  id: string;
  organizationId: string;
  userId: string;
  invitedBy?: string;
  user?: {
    id: string;
    name?: string;
    email: string;
    avatar?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  invitedAt?: string;
  joinedAt?: string;
  lastActiveAt?: string;
};

export type ClientInvitation = Omit<InvitationDocument, '_id' | 'organizationId' | 'invitedBy' | 'acceptedBy' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'acceptedAt'> & {
  id: string;
  organizationId: string;
  invitedBy: string;
  acceptedBy?: string;
  organization?: {
    id: string;
    name: string;
    logo?: string;
  };
  invitedByUser?: {
    id: string;
    name?: string;
    email: string;
  };
  createdAt?: string;
  updatedAt?: string;
  expiresAt: string;
  acceptedAt?: string;
};
