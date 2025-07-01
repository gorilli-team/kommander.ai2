import { connectToDatabase } from './mongodb';

export interface Integration {
  id: string;
  userId: string;
  type: 'slack' | 'discord' | 'teams' | 'salesforce' | 'hubspot' | 'zendesk' | 'intercom' | 'zapier' | 'webhook';
  name: string;
  config: any;
  isActive: boolean;
  createdAt: Date;
  lastSync?: Date;
  credentials?: {
    accessToken?: string;
    refreshToken?: string;
    apiKey?: string;
    webhookUrl?: string;
    clientId?: string;
    clientSecret?: string;
  };
}

export interface IntegrationEvent {
  integrationId: string;
  eventType: 'message_sent' | 'conversation_started' | 'conversation_ended' | 'user_rated' | 'escalation_triggered';
  payload: any;
  timestamp: Date;
  status: 'pending' | 'sent' | 'failed';
  retryCount: number;
}

class IntegrationService {
  
  /**
   * Slack Integration
   */
  async sendSlackNotification(integrationId: string, message: string, channel?: string): Promise<void> {
    const integration = await this.getIntegration(integrationId);
    if (!integration || integration.type !== 'slack') return;

    const slackUrl = 'https://slack.com/api/chat.postMessage';
    const response = await fetch(slackUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${integration.credentials?.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channel || integration.config.defaultChannel,
        text: message,
        username: 'Kommander.ai',
        icon_emoji: ':robot_face:'
      })
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }
  }

  /**
   * Discord Integration
   */
  async sendDiscordWebhook(integrationId: string, content: string): Promise<void> {
    const integration = await this.getIntegration(integrationId);
    if (!integration || integration.type !== 'discord') return;

    const response = await fetch(integration.credentials?.webhookUrl!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        username: 'Kommander.ai',
        avatar_url: 'https://your-domain.com/bot-avatar.png'
      })
    });

    if (!response.ok) {
      throw new Error(`Discord webhook error: ${response.statusText}`);
    }
  }

  /**
   * Salesforce Integration
   */
  async createSalesforceCase(integrationId: string, caseData: any): Promise<string> {
    const integration = await this.getIntegration(integrationId);
    if (!integration || integration.type !== 'salesforce') throw new Error('Invalid Salesforce integration');

    const response = await fetch(`${integration.config.instanceUrl}/services/data/v58.0/sobjects/Case/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${integration.credentials?.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Subject: caseData.subject,
        Description: caseData.description,
        Origin: 'Kommander.ai Chat',
        Priority: caseData.priority || 'Medium',
        Status: 'New'
      })
    });

    if (!response.ok) {
      throw new Error(`Salesforce API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.id;
  }

  /**
   * HubSpot Integration
   */
  async createHubSpotContact(integrationId: string, contactData: any): Promise<string> {
    const integration = await this.getIntegration(integrationId);
    if (!integration || integration.type !== 'hubspot') throw new Error('Invalid HubSpot integration');

    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${integration.credentials?.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          email: contactData.email,
          firstname: contactData.firstName,
          lastname: contactData.lastName,
          phone: contactData.phone,
          hs_lead_status: 'NEW',
          lifecyclestage: 'lead',
          lead_source: 'Kommander.ai Chat'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HubSpot API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.id;
  }

  /**
   * Zendesk Integration
   */
  async createZendeskTicket(integrationId: string, ticketData: any): Promise<string> {
    const integration = await this.getIntegration(integrationId);
    if (!integration || integration.type !== 'zendesk') throw new Error('Invalid Zendesk integration');

    const response = await fetch(`${integration.config.subdomain}.zendesk.com/api/v2/tickets.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${integration.credentials?.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ticket: {
          subject: ticketData.subject,
          comment: {
            body: ticketData.description
          },
          requester: {
            email: ticketData.requesterEmail,
            name: ticketData.requesterName
          },
          priority: ticketData.priority || 'normal',
          type: 'question',
          tags: ['kommander-ai', 'chat-escalation']
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Zendesk API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.ticket.id;
  }

  /**
   * Zapier Webhook
   */
  async triggerZapierWebhook(integrationId: string, data: any): Promise<void> {
    const integration = await this.getIntegration(integrationId);
    if (!integration || integration.type !== 'zapier') return;

    const response = await fetch(integration.credentials?.webhookUrl!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        source: 'kommander-ai',
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Zapier webhook error: ${response.statusText}`);
    }
  }

  /**
   * Generic Webhook
   */
  async sendWebhook(integrationId: string, payload: any): Promise<void> {
    const integration = await this.getIntegration(integrationId);
    if (!integration || integration.type !== 'webhook') return;

    const response = await fetch(integration.credentials?.webhookUrl!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kommander.ai/1.0',
        ...(integration.config.headers || {})
      },
      body: JSON.stringify({
        ...payload,
        integration_id: integrationId,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Webhook error: ${response.statusText}`);
    }
  }

  /**
   * Event Processing
   */
  async processEvent(event: IntegrationEvent): Promise<void> {
    const integration = await this.getIntegration(event.integrationId);
    if (!integration || !integration.isActive) return;

    try {
      switch (integration.type) {
        case 'slack':
          if (event.eventType === 'escalation_triggered') {
            await this.sendSlackNotification(
              event.integrationId,
              `🚨 Escalation: ${event.payload.reason}\nConversation ID: ${event.payload.conversationId}`
            );
          }
          break;

        case 'salesforce':
          if (event.eventType === 'escalation_triggered') {
            await this.createSalesforceCase(event.integrationId, {
              subject: `Chat Escalation - ${event.payload.reason}`,
              description: event.payload.transcript,
              priority: 'High'
            });
          }
          break;

        case 'hubspot':
          if (event.eventType === 'conversation_started' && event.payload.userEmail) {
            await this.createHubSpotContact(event.integrationId, {
              email: event.payload.userEmail,
              firstName: event.payload.userName?.split(' ')[0],
              lastName: event.payload.userName?.split(' ')[1]
            });
          }
          break;

        case 'zapier':
          await this.triggerZapierWebhook(event.integrationId, {
            event_type: event.eventType,
            ...event.payload
          });
          break;

        case 'webhook':
          await this.sendWebhook(event.integrationId, {
            event_type: event.eventType,
            ...event.payload
          });
          break;
      }

      // Mark as sent
      await this.updateEventStatus(event.integrationId, event.timestamp, 'sent');

    } catch (error) {
      console.error(`Integration error for ${integration.type}:`, error);
      
      // Retry logic
      if (event.retryCount < 3) {
        await this.scheduleRetry(event);
      } else {
        await this.updateEventStatus(event.integrationId, event.timestamp, 'failed');
      }
    }
  }

  /**
   * Database Operations
   */
  private async getIntegration(integrationId: string): Promise<Integration | null> {
    const { db } = await connectToDatabase();
    return await db.collection('integrations').findOne({ id: integrationId });
  }

  private async updateEventStatus(integrationId: string, timestamp: Date, status: string): Promise<void> {
    const { db } = await connectToDatabase();
    await db.collection('integration_events').updateOne(
      { integrationId, timestamp },
      { $set: { status, updatedAt: new Date() } }
    );
  }

  private async scheduleRetry(event: IntegrationEvent): Promise<void> {
    const { db } = await connectToDatabase();
    const retryDelay = Math.pow(2, event.retryCount) * 1000; // Exponential backoff
    
    await db.collection('integration_events').updateOne(
      { integrationId: event.integrationId, timestamp: event.timestamp },
      { 
        $set: { 
          status: 'pending',
          retryCount: event.retryCount + 1,
          scheduledFor: new Date(Date.now() + retryDelay)
        }
      }
    );
  }

  /**
   * OAuth Management
   */
  async refreshAccessToken(integrationId: string): Promise<void> {
    const integration = await this.getIntegration(integrationId);
    if (!integration?.credentials?.refreshToken) return;

    let tokenUrl = '';
    let clientData = {};

    switch (integration.type) {
      case 'salesforce':
        tokenUrl = `${integration.config.instanceUrl}/services/oauth2/token`;
        clientData = {
          grant_type: 'refresh_token',
          refresh_token: integration.credentials.refreshToken,
          client_id: integration.credentials.clientId,
          client_secret: integration.credentials.clientSecret
        };
        break;

      case 'hubspot':
        tokenUrl = 'https://api.hubapi.com/oauth/v1/token';
        clientData = {
          grant_type: 'refresh_token',
          refresh_token: integration.credentials.refreshToken,
          client_id: integration.credentials.clientId,
          client_secret: integration.credentials.clientSecret
        };
        break;
    }

    if (!tokenUrl) return;

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(clientData)
    });

    if (response.ok) {
      const tokens = await response.json();
      await this.updateIntegrationCredentials(integrationId, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || integration.credentials.refreshToken
      });
    }
  }

  private async updateIntegrationCredentials(integrationId: string, credentials: any): Promise<void> {
    const { db } = await connectToDatabase();
    await db.collection('integrations').updateOne(
      { id: integrationId },
      { 
        $set: { 
          credentials: { ...credentials },
          lastSync: new Date(),
          updatedAt: new Date()
        }
      }
    );
  }
}

export const integrationService = new IntegrationService();
