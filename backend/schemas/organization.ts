import { z } from 'zod';
import { ObjectId } from 'mongodb';

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

// Basic member schema 
export const OrganizationMemberSchema = z.object({
  _id: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  organizationId: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  userId: z.custom<ObjectId>((val) => ObjectId.isValid(val as string) || typeof val === 'object'),
  role: z.enum(['admin', 'member']).default('member'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type OrganizationMemberDocument = z.infer<typeof OrganizationMemberSchema>;

// Client-safe types
export type ClientOrganization = Omit<OrganizationDocument, '_id' | 'ownerId' | 'createdAt' | 'updatedAt'> & {
  id: string;
  ownerId: string;
  createdAt?: string;
  updatedAt?: string;
};
