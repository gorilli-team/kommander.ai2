import { connectToDatabase } from './mongodb';
import { ObjectId } from 'mongodb';

export interface GdprRequest {
  id: string;
  userId: string;
  type: 'access' | 'portability' | 'deletion' | 'rectification' | 'restriction';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestDate: Date;
  completionDate?: Date;
  requestDetails?: string;
  responseData?: any;
  userEmail: string;
  userName?: string;
}

export interface ConsentRecord {
  userId: string;
  consentType: string;
  granted: boolean;
  timestamp: Date;
  version: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface DataRetentionPolicy {
  dataType: string;
  retentionPeriod: number; // in days
  description: string;
  lastReviewDate: Date;
}

class GdprComplianceService {
  
  /**
   * Record user consent
   */
  async recordConsent(consent: ConsentRecord): Promise<void> {
    const { db } = await connectToDatabase();
    
    await db.collection('user_consents').insertOne({
      ...consent,
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  /**
   * Get user's current consent status
   */
  async getUserConsent(userId: string): Promise<ConsentRecord[]> {
    const { db } = await connectToDatabase();
    
    return await db.collection('user_consents')
      .find({ userId })
      .sort({ timestamp: -1 })
      .toArray();
  }

  /**
   * Update user consent
   */
  async updateConsent(userId: string, consentType: string, granted: boolean, metadata?: any): Promise<void> {
    const consentRecord: ConsentRecord = {
      userId,
      consentType,
      granted,
      timestamp: new Date(),
      version: '1.0',
      ...metadata
    };

    await this.recordConsent(consentRecord);
  }

  /**
   * Submit a GDPR request (Data Subject Request)
   */
  async submitGdprRequest(request: Omit<GdprRequest, 'id' | 'status' | 'requestDate'>): Promise<string> {
    const { db } = await connectToDatabase();
    
    const gdprRequest: GdprRequest = {
      ...request,
      id: new ObjectId().toString(),
      status: 'pending',
      requestDate: new Date()
    };

    await db.collection('gdpr_requests').insertOne({
      ...gdprRequest,
      _id: new ObjectId(gdprRequest.id),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Send notification to admin
    await this.notifyAdminOfGdprRequest(gdprRequest);

    return gdprRequest.id;
  }

  /**
   * Process data access request (Article 15 GDPR)
   */
  async processDataAccessRequest(requestId: string): Promise<any> {
    const { db } = await connectToDatabase();
    
    const request = await db.collection('gdpr_requests').findOne({ _id: new ObjectId(requestId) });
    if (!request) {
      throw new Error('GDPR request not found');
    }

    // Update status to processing
    await db.collection('gdpr_requests').updateOne(
      { _id: new ObjectId(requestId) },
      { 
        $set: { 
          status: 'processing', 
          updatedAt: new Date() 
        } 
      }
    );

    // Collect all user data
    const userData = await this.collectUserData(request.userId);

    // Update request with response data
    await db.collection('gdpr_requests').updateOne(
      { _id: new ObjectId(requestId) },
      { 
        $set: { 
          status: 'completed',
          completionDate: new Date(),
          responseData: userData,
          updatedAt: new Date()
        } 
      }
    );

    return userData;
  }

  /**
   * Process data deletion request (Article 17 GDPR - Right to be forgotten)
   */
  async processDataDeletionRequest(requestId: string, retainLegal: boolean = true): Promise<void> {
    const { db } = await connectToDatabase();
    
    const request = await db.collection('gdpr_requests').findOne({ _id: new ObjectId(requestId) });
    if (!request) {
      throw new Error('GDPR request not found');
    }

    // Update status to processing
    await db.collection('gdpr_requests').updateOne(
      { _id: new ObjectId(requestId) },
      { 
        $set: { 
          status: 'processing', 
          updatedAt: new Date() 
        } 
      }
    );

    const userId = request.userId;

    // Delete or anonymize user data based on retention policies
    if (retainLegal) {
      // Anonymize data instead of deleting for legal compliance
      await this.anonymizeUserData(userId);
    } else {
      // Complete deletion
      await this.deleteUserData(userId);
    }

    // Update request status
    await db.collection('gdpr_requests').updateOne(
      { _id: new ObjectId(requestId) },
      { 
        $set: { 
          status: 'completed',
          completionDate: new Date(),
          updatedAt: new Date()
        } 
      }
    );
  }

  /**
   * Collect all user data for access request
   */
  private async collectUserData(userId: string): Promise<any> {
    const { db } = await connectToDatabase();

    const userData = {
      personalInfo: {},
      conversations: [],
      settings: {},
      analyticsData: [],
      consents: [],
      billingData: []
    };

    try {
      // Personal information
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (user) {
        userData.personalInfo = {
          id: user._id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        };
      }

      // Conversations
      userData.conversations = await db.collection('conversations')
        .find({ userId })
        .toArray();

      // Settings
      userData.settings = await db.collection('settings')
        .findOne({ userId }) || {};

      // Analytics events
      userData.analyticsData = await db.collection('analytics_events')
        .find({ userId })
        .limit(1000) // Limit for performance
        .toArray();

      // Consent records
      userData.consents = await db.collection('user_consents')
        .find({ userId })
        .toArray();

      // Billing information (if exists)
      userData.billingData = await db.collection('subscriptions')
        .find({ userId })
        .toArray();

    } catch (error) {
      console.error('Error collecting user data:', error);
    }

    return userData;
  }

  /**
   * Anonymize user data while preserving analytics value
   */
  private async anonymizeUserData(userId: string): Promise<void> {
    const { db } = await connectToDatabase();

    // Anonymize user record
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: {
          email: `anonymized_${userId}@deleted.local`,
          name: 'Anonymized User',
          anonymized: true,
          anonymizedAt: new Date()
        }
      }
    );

    // Anonymize conversations - keep content for analytics but remove PII
    await db.collection('conversations').updateMany(
      { userId },
      { 
        $set: {
          userId: `anonymized_${userId}`,
          anonymized: true
        }
      }
    );

    // Keep analytics data but anonymize user reference
    await db.collection('analytics_events').updateMany(
      { userId },
      { 
        $set: {
          userId: `anonymized_${userId}`,
          anonymized: true
        }
      }
    );

    // Remove personal settings
    await db.collection('settings').deleteOne({ userId });

    // Mark consent records as anonymized
    await db.collection('user_consents').updateMany(
      { userId },
      { 
        $set: {
          userId: `anonymized_${userId}`,
          anonymized: true
        }
      }
    );
  }

  /**
   * Complete deletion of user data
   */
  private async deleteUserData(userId: string): Promise<void> {
    const { db } = await connectToDatabase();

    // Delete user record
    await db.collection('users').deleteOne({ _id: new ObjectId(userId) });

    // Delete conversations
    await db.collection('conversations').deleteMany({ userId });

    // Delete settings
    await db.collection('settings').deleteOne({ userId });

    // Delete analytics events
    await db.collection('analytics_events').deleteMany({ userId });

    // Delete consent records
    await db.collection('user_consents').deleteMany({ userId });

    // Delete billing data
    await db.collection('subscriptions').deleteMany({ userId });

    // Delete any cached data
    await db.collection('cache').deleteMany({ userId });
  }

  /**
   * Export user data in portable format (Article 20 GDPR)
   */
  async exportUserDataPortable(userId: string): Promise<any> {
    const userData = await this.collectUserData(userId);
    
    // Format data for portability (JSON format)
    const portableData = {
      exportDate: new Date().toISOString(),
      userId: userId,
      format: 'JSON',
      version: '1.0',
      data: userData
    };

    return portableData;
  }

  /**
   * Get all GDPR requests for admin dashboard
   */
  async getGdprRequests(limit: number = 50, offset: number = 0): Promise<GdprRequest[]> {
    const { db } = await connectToDatabase();
    
    return await db.collection('gdpr_requests')
      .find({})
      .sort({ requestDate: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
  }

  /**
   * Auto-delete data based on retention policies
   */
  async enforceDataRetention(): Promise<void> {
    const { db } = await connectToDatabase();
    
    // Get retention policies
    const policies = await db.collection('data_retention_policies').find({}).toArray();

    for (const policy of policies) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriod);

      switch (policy.dataType) {
        case 'analytics_events':
          await db.collection('analytics_events').deleteMany({
            createdAt: { $lt: cutoffDate }
          });
          break;
        
        case 'conversation_logs':
          // Only delete anonymized conversations older than retention period
          await db.collection('conversations').deleteMany({
            createdAt: { $lt: cutoffDate },
            anonymized: true
          });
          break;
        
        case 'security_logs':
          await db.collection('security_logs').deleteMany({
            createdAt: { $lt: cutoffDate }
          });
          break;
      }
    }
  }

  /**
   * Generate GDPR compliance report
   */
  async generateComplianceReport(): Promise<any> {
    const { db } = await connectToDatabase();

    const report = {
      generatedAt: new Date(),
      totalUsers: await db.collection('users').countDocuments({}),
      activeRequests: await db.collection('gdpr_requests').countDocuments({ status: { $in: ['pending', 'processing'] } }),
      completedRequests: await db.collection('gdpr_requests').countDocuments({ status: 'completed' }),
      dataRetentionCompliance: await this.checkRetentionCompliance(),
      consentMetrics: await this.getConsentMetrics()
    };

    return report;
  }

  private async checkRetentionCompliance(): Promise<any> {
    const { db } = await connectToDatabase();
    
    // Check if data retention is being enforced properly
    const policies = await db.collection('data_retention_policies').find({}).toArray();
    const compliance = {};

    for (const policy of policies) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriod);

      const oldDataCount = await db.collection(policy.dataType).countDocuments({
        createdAt: { $lt: cutoffDate }
      });

      compliance[policy.dataType] = {
        policy: policy.retentionPeriod + ' days',
        oldDataFound: oldDataCount,
        compliant: oldDataCount === 0
      };
    }

    return compliance;
  }

  private async getConsentMetrics(): Promise<any> {
    const { db } = await connectToDatabase();

    const totalConsents = await db.collection('user_consents').countDocuments({});
    const grantedConsents = await db.collection('user_consents').countDocuments({ granted: true });
    const revokedConsents = await db.collection('user_consents').countDocuments({ granted: false });

    return {
      total: totalConsents,
      granted: grantedConsents,
      revoked: revokedConsents,
      grantRate: totalConsents > 0 ? (grantedConsents / totalConsents) * 100 : 0
    };
  }

  private async notifyAdminOfGdprRequest(request: GdprRequest): Promise<void> {
    // Implementation for admin notification
    // This could send an email, create a notification, etc.
    console.log(`New GDPR request: ${request.type} from ${request.userEmail}`);
  }
}

export const gdprService = new GdprComplianceService();
