import { connectToDatabase } from './mongodb';
import { ObjectId } from 'mongodb';
import { 
  OrganizationDocument, 
  OrganizationMemberDocument, 
  InvitationDocument,
  UserProfileDocument,
  UserRoleType, 
  PermissionType,
  DEFAULT_ROLE_PERMISSIONS,
  ClientOrganization,
  ClientOrganizationMember,
  ClientInvitation
} from '../schemas/organization';
import { UserDocument } from '../schemas/user';
import crypto from 'crypto';

export class OrganizationService {
  private db: any;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.initializeDb();
  }

  private async initializeDb() {
    const { db } = await connectToDatabase();
    this.db = db;
    await this.createIndexes();
  }

  private async ensureInitialized() {
    await this.initPromise;
    if (!this.db) {
      throw new Error('Database not initialized');
    }
  }

  private async createIndexes() {
    if (!this.db) return;
    
    try {
      console.log('[OrganizationService] Creating database indexes for performance...');
      
      // Organizations indexes - handle existing null values
      try {
        await this.db.collection('organizations').createIndex({ slug: 1 }, { unique: true, sparse: true });
      } catch (error: any) {
        if (error.code === 11000) {
          console.log('[OrganizationService] Slug index already exists or has duplicates, skipping...');
        } else {
          throw error;
        }
      }
      await this.db.collection('organizations').createIndex({ ownerId: 1 });
      await this.db.collection('organizations').createIndex({ isActive: 1 });
      await this.db.collection('organizations').createIndex({ createdAt: -1 });
      
      // Organization members indexes - optimized for getUserOrganizations
      await this.db.collection('organization_members').createIndex({ organizationId: 1, userId: 1 }, { unique: true });
      await this.db.collection('organization_members').createIndex({ userId: 1, status: 1 });
      await this.db.collection('organization_members').createIndex({ organizationId: 1, status: 1 });
      await this.db.collection('organization_members').createIndex({ createdAt: -1 });
      
      // Invitations indexes - optimized for faster lookups
      await this.db.collection('invitations').createIndex({ token: 1 }, { unique: true });
      await this.db.collection('invitations').createIndex({ email: 1, organizationId: 1 });
      await this.db.collection('invitations').createIndex({ organizationId: 1, status: 1 });
      await this.db.collection('invitations').createIndex({ status: 1, expiresAt: 1 });
      await this.db.collection('invitations').createIndex({ 
        expiresAt: 1 
      }, { 
        expireAfterSeconds: 0 
      });

      // User profiles indexes
      await this.db.collection('user_profiles').createIndex({ userId: 1 }, { unique: true });
      
      // Users collection indexes for invitation lookups
      await this.db.collection('users').createIndex({ email: 1 });
      
      console.log('[OrganizationService] Database indexes created successfully');
    } catch (error) {
      console.error('Failed to create organization indexes:', error);
    }
  }

  /**
   * Create a new organization
   */
  async createOrganization(data: {
    name: string;
    slug: string;
    description?: string;
    ownerId: string;
    settings?: any;
  }): Promise<string> {
    await this.ensureInitialized();

    // Validate ownerId is a valid ObjectId
    if (!ObjectId.isValid(data.ownerId)) {
      throw new Error(`Invalid ownerId: ${data.ownerId}. Must be a valid ObjectId.`);
    }

    const organizationId = new ObjectId();
    const now = new Date();

    // Create organization
    const organization: Omit<OrganizationDocument, '_id'> = {
      name: data.name,
      slug: data.slug,
      description: data.description,
      ownerId: new ObjectId(data.ownerId),
      settings: {
        allowPublicJoin: false,
        requireApproval: true,
        defaultRole: 'user' as UserRoleType,
        maxMembers: 10,
        ...data.settings
      },
      plan: 'free',
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    await this.db.collection('organizations').insertOne({
      _id: organizationId,
      ...organization
    });

    // Add owner as admin member
    await this.addMember({
      organizationId: organizationId.toString(),
      userId: data.ownerId,
      role: 'admin',
      status: 'active',
      joinedAt: now
    });

    return organizationId.toString();
  }

  /**
   * Get organization by ID with user role and permissions
   */
  async getOrganization(organizationId: string, userId?: string): Promise<ClientOrganization | null> {
    await this.ensureInitialized();

    const org = await this.db.collection('organizations').findOne({ 
      _id: new ObjectId(organizationId) 
    });

    if (!org) return null;

    let userRole: UserRoleType | undefined;
    let userPermissions: PermissionType[] | undefined;
    let memberCount = 0;

    // Get member count
    memberCount = await this.db.collection('organization_members').countDocuments({
      organizationId: new ObjectId(organizationId),
      status: 'active'
    });

    // Get user role and permissions if userId provided
    if (userId) {
      const membership = await this.db.collection('organization_members').findOne({
        organizationId: new ObjectId(organizationId),
        userId: new ObjectId(userId),
        status: 'active'
      });

      if (membership) {
        userRole = membership.role;
        userPermissions = membership.permissions || DEFAULT_ROLE_PERMISSIONS[membership.role];
      }
    }

    return {
      id: org._id.toString(),
      name: org.name,
      slug: org.slug,
      description: org.description,
      logo: org.logo,
      website: org.website,
      settings: org.settings,
      ownerId: org.ownerId.toString(),
      plan: org.plan,
      isActive: org.isActive,
      memberCount,
      userRole,
      userPermissions,
      createdAt: org.createdAt?.toISOString(),
      updatedAt: org.updatedAt?.toISOString()
    };
  }

  /**
   * Get user's organizations with optimized aggregation
   */
  async getUserOrganizations(userId: string): Promise<ClientOrganization[]> {
    await this.ensureInitialized();

    // Validate userId is a valid ObjectId
    if (!ObjectId.isValid(userId)) {
      console.warn(`Invalid userId for getUserOrganizations: ${userId}`);
      return [];
    }

    console.log(`[getUserOrganizations] Fetching organizations for user: ${userId}`);
    const startTime = Date.now();

    // Use aggregation pipeline for better performance
    const result = await this.db.collection('organization_members').aggregate([
      {
        $match: {
          userId: new ObjectId(userId),
          status: 'active'
        }
      },
      {
        $lookup: {
          from: 'organizations',
          localField: 'organizationId',
          foreignField: '_id',
          as: 'organization'
        }
      },
      {
        $unwind: '$organization'
      },
      {
        $match: {
          'organization.isActive': true
        }
      },
      {
        $lookup: {
          from: 'organization_members',
          let: { orgId: '$organizationId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$organizationId', '$$orgId'] },
                    { $eq: ['$status', 'active'] }
                  ]
                }
              }
            },
            {
              $count: 'count'
            }
          ],
          as: 'memberCount'
        }
      },
      {
        $project: {
          id: '$organization._id',
          name: '$organization.name',
          slug: '$organization.slug',
          description: '$organization.description',
          logo: '$organization.logo',
          website: '$organization.website',
          settings: '$organization.settings',
          ownerId: '$organization.ownerId',
          plan: '$organization.plan',
          isActive: '$organization.isActive',
          memberCount: { $ifNull: [{ $arrayElemAt: ['$memberCount.count', 0] }, 0] },
          userRole: '$role',
          userPermissions: '$permissions',
          createdAt: '$organization.createdAt',
          updatedAt: '$organization.updatedAt'
        }
      },
      {
        $sort: { 'createdAt': -1 }
      }
    ]).toArray();

    const endTime = Date.now();
    console.log(`[getUserOrganizations] Query completed in ${endTime - startTime}ms, found ${result.length} organizations`);

    return result.map(org => ({
      id: org.id.toString(),
      name: org.name,
      slug: org.slug,
      description: org.description,
      logo: org.logo,
      website: org.website,
      settings: org.settings,
      ownerId: org.ownerId.toString(),
      plan: org.plan,
      isActive: org.isActive,
      memberCount: org.memberCount,
      userRole: org.userRole,
      userPermissions: org.userPermissions || DEFAULT_ROLE_PERMISSIONS[org.userRole],
      createdAt: org.createdAt?.toISOString(),
      updatedAt: org.updatedAt?.toISOString()
    }));
  }

  /**
   * Add member to organization
   */
  async addMember(data: {
    organizationId: string;
    userId: string;
    role: UserRoleType;
    permissions?: PermissionType[];
    status?: 'active' | 'inactive' | 'suspended';
    invitedBy?: string;
    joinedAt?: Date;
  }): Promise<string> {
    await this.ensureInitialized();

    // Validate ObjectIds
    if (!ObjectId.isValid(data.organizationId)) {
      throw new Error(`Invalid organizationId: ${data.organizationId}`);
    }
    if (!ObjectId.isValid(data.userId)) {
      throw new Error(`Invalid userId: ${data.userId}`);
    }
    if (data.invitedBy && !ObjectId.isValid(data.invitedBy)) {
      throw new Error(`Invalid invitedBy: ${data.invitedBy}`);
    }

    const memberId = new ObjectId();
    const now = new Date();

    const member: Omit<OrganizationMemberDocument, '_id'> = {
      organizationId: new ObjectId(data.organizationId),
      userId: new ObjectId(data.userId),
      role: data.role,
      permissions: data.permissions || DEFAULT_ROLE_PERMISSIONS[data.role],
      status: data.status || 'active',
      invitedBy: data.invitedBy ? new ObjectId(data.invitedBy) : undefined,
      joinedAt: data.joinedAt || now,
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now
    };

    await this.db.collection('organization_members').insertOne({
      _id: memberId,
      ...member
    });

    return memberId.toString();
  }

  /**
   * Get organization members
   */
  async getOrganizationMembers(organizationId: string): Promise<ClientOrganizationMember[]> {
    await this.ensureInitialized();

    const members = await this.db.collection('organization_members').aggregate([
      {
        $match: {
          organizationId: new ObjectId(organizationId),
          status: { $in: ['active', 'inactive'] }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $lookup: {
          from: 'user_profiles',
          localField: 'userId',
          foreignField: 'userId',
          as: 'profile'
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]).toArray();

    return members.map(member => ({
      id: member._id.toString(),
      organizationId: member.organizationId.toString(),
      userId: member.userId.toString(),
      role: member.role,
      permissions: member.permissions,
      customPermissions: member.customPermissions,
      status: member.status,
      invitedBy: member.invitedBy?.toString(),
      user: {
        id: member.user._id.toString(),
        name: member.user.name,
        email: member.user.email,
        avatar: member.profile?.[0]?.avatar
      },
      createdAt: member.createdAt?.toISOString(),
      updatedAt: member.updatedAt?.toISOString(),
      invitedAt: member.invitedAt?.toISOString(),
      joinedAt: member.joinedAt?.toISOString(),
      lastActiveAt: member.lastActiveAt?.toISOString()
    }));
  }

  /**
   * Update member role/permissions
   */
  async updateMember(
    organizationId: string, 
    userId: string, 
    updates: {
      role?: UserRoleType;
      permissions?: PermissionType[];
      status?: 'active' | 'inactive' | 'suspended';
    }
  ): Promise<boolean> {
    await this.ensureInitialized();

    const updateData: any = {
      updatedAt: new Date()
    };

    if (updates.role) {
      updateData.role = updates.role;
      updateData.permissions = updates.permissions || DEFAULT_ROLE_PERMISSIONS[updates.role];
    }
    if (updates.permissions) updateData.permissions = updates.permissions;
    if (updates.status) updateData.status = updates.status;

    const result = await this.db.collection('organization_members').updateOne(
      {
        organizationId: new ObjectId(organizationId),
        userId: new ObjectId(userId)
      },
      { $set: updateData }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Remove member from organization
   */
  async removeMember(organizationId: string, userId: string): Promise<boolean> {
    await this.ensureInitialized();

    const result = await this.db.collection('organization_members').deleteOne({
      organizationId: new ObjectId(organizationId),
      userId: new ObjectId(userId)
    });

    return result.deletedCount > 0;
  }

  /**
   * Create invitation
   */
  async createInvitation(data: {
    organizationId: string;
    email: string;
    role: UserRoleType;
    invitedBy: string;
    message?: string;
    expiresInDays?: number;
  }): Promise<string> {
    await this.ensureInitialized();

    const token = crypto.randomBytes(32).toString('hex');
    const invitationId = new ObjectId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (data.expiresInDays || 7) * 24 * 60 * 60 * 1000);

    const invitation: Omit<InvitationDocument, '_id'> = {
      organizationId: new ObjectId(data.organizationId),
      email: data.email.toLowerCase(),
      role: data.role,
      token,
      status: 'pending',
      message: data.message,
      expiresAt,
      invitedBy: new ObjectId(data.invitedBy),
      createdAt: now,
      updatedAt: now
    };

    await this.db.collection('invitations').insertOne({
      _id: invitationId,
      ...invitation
    });

    return token;
  }

  /**
   * Get invitation by token
   */
  async getInvitationByToken(token: string): Promise<ClientInvitation | null> {
    await this.ensureInitialized();

    const invitation = await this.db.collection('invitations').aggregate([
      {
        $match: {
          token,
          status: 'pending',
          expiresAt: { $gt: new Date() }
        }
      },
      {
        $lookup: {
          from: 'organizations',
          localField: 'organizationId',
          foreignField: '_id',
          as: 'organization'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'invitedBy',
          foreignField: '_id',
          as: 'invitedByUser'
        }
      },
      {
        $unwind: '$organization'
      },
      {
        $unwind: '$invitedByUser'
      }
    ]).toArray();

    if (!invitation.length) return null;

    const inv = invitation[0];
    return {
      id: inv._id.toString(),
      organizationId: inv.organizationId.toString(),
      email: inv.email,
      role: inv.role,
      permissions: inv.permissions,
      token: inv.token,
      status: inv.status,
      message: inv.message,
      invitedBy: inv.invitedBy.toString(),
      organization: {
        id: inv.organization._id.toString(),
        name: inv.organization.name,
        logo: inv.organization.logo
      },
      invitedByUser: {
        id: inv.invitedByUser._id.toString(),
        name: inv.invitedByUser.name,
        email: inv.invitedByUser.email
      },
      createdAt: inv.createdAt?.toISOString(),
      updatedAt: inv.updatedAt?.toISOString(),
      expiresAt: inv.expiresAt.toISOString(),
      acceptedAt: inv.acceptedAt?.toISOString()
    };
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(token: string, userId: string): Promise<boolean> {
    await this.ensureInitialized();

    const invitation = await this.db.collection('invitations').findOne({
      token,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (!invitation) {
      console.log('[acceptInvitation] Invitation not found or expired');
      return false;
    }

    // Check if user email matches invitation email
    const user = await this.db.collection('users').findOne({
      _id: new ObjectId(userId)
    });

    if (!user) {
      console.log('[acceptInvitation] User not found');
      return false;
    }

    // More flexible email matching - normalize both emails
    const userEmail = user.email.toLowerCase().trim();
    const inviteEmail = invitation.email.toLowerCase().trim();
    
    if (userEmail !== inviteEmail) {
      console.log(`[acceptInvitation] Email mismatch: ${userEmail} vs ${inviteEmail}`);
      return false;
    }

    // Check if user is already a member of the organization
    const existingMember = await this.db.collection('organization_members').findOne({
      organizationId: invitation.organizationId,
      userId: new ObjectId(userId)
    });

    if (existingMember) {
      console.log('[acceptInvitation] User is already a member of this organization');
      // Update invitation status to accepted even if user is already a member
      await this.db.collection('invitations').updateOne(
        { _id: invitation._id },
        {
          $set: {
            status: 'accepted',
            acceptedAt: new Date(),
            acceptedBy: new ObjectId(userId),
            updatedAt: new Date()
          }
        }
      );
      return true;
    }

    try {
      // Add user to organization
      await this.addMember({
        organizationId: invitation.organizationId.toString(),
        userId,
        role: invitation.role,
        permissions: invitation.permissions,
        invitedBy: invitation.invitedBy.toString(),
        joinedAt: new Date()
      });

      // Update invitation status
      await this.db.collection('invitations').updateOne(
        { _id: invitation._id },
        {
          $set: {
            status: 'accepted',
            acceptedAt: new Date(),
            acceptedBy: new ObjectId(userId),
            updatedAt: new Date()
          }
        }
      );

      console.log('[acceptInvitation] Successfully accepted invitation and added user to organization');
      return true;
    } catch (error: any) {
      console.error('[acceptInvitation] Error adding member to organization:', error);
      
      // Check if it's a duplicate key error (user already exists)
      if (error.code === 11000) {
        console.log('[acceptInvitation] Duplicate member detected, updating invitation status');
        await this.db.collection('invitations').updateOne(
          { _id: invitation._id },
          {
            $set: {
              status: 'accepted',
              acceptedAt: new Date(),
              acceptedBy: new ObjectId(userId),
              updatedAt: new Date()
            }
          }
        );
        return true;
      }
      
      return false;
    }
  }

  /**
   * Check if user has permission
   */
  async hasPermission(
    userId: string, 
    organizationId: string, 
    permission: PermissionType
  ): Promise<boolean> {
    await this.ensureInitialized();

    const member = await this.db.collection('organization_members').findOne({
      userId: new ObjectId(userId),
      organizationId: new ObjectId(organizationId),
      status: 'active'
    });

    if (!member) return false;

    const userPermissions = member.permissions || DEFAULT_ROLE_PERMISSIONS[member.role];
    return userPermissions.includes(permission);
  }

  /**
   * Get organization invitations
   */
  async getOrganizationInvitations(organizationId: string): Promise<ClientInvitation[]> {
    await this.ensureInitialized();

    const invitations = await this.db.collection('invitations').aggregate([
      {
        $match: {
          organizationId: new ObjectId(organizationId)
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'invitedBy',
          foreignField: '_id',
          as: 'invitedByUser'
        }
      },
      {
        $unwind: '$invitedByUser'
      },
      {
        $sort: { createdAt: -1 }
      }
    ]).toArray();

    return invitations.map(inv => ({
      id: inv._id.toString(),
      organizationId: inv.organizationId.toString(),
      email: inv.email,
      role: inv.role,
      permissions: inv.permissions,
      token: inv.token,
      status: inv.status,
      message: inv.message,
      invitedBy: inv.invitedBy.toString(),
      invitedByUser: {
        id: inv.invitedByUser._id.toString(),
        name: inv.invitedByUser.name,
        email: inv.invitedByUser.email
      },
      createdAt: inv.createdAt?.toISOString(),
      updatedAt: inv.updatedAt?.toISOString(),
      expiresAt: inv.expiresAt.toISOString(),
      acceptedAt: inv.acceptedAt?.toISOString()
    }));
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(invitationId: string): Promise<boolean> {
    await this.ensureInitialized();

    const result = await this.db.collection('invitations').updateOne(
      { _id: new ObjectId(invitationId) },
      {
        $set: {
          status: 'cancelled',
          updatedAt: new Date()
        }
      }
    );

    return result.modifiedCount > 0;
  }
}

export const organizationService = new OrganizationService();
