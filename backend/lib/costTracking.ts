import { MongoClient, Collection } from 'mongodb';
import { getMongoClient } from './mongodb';

// Prezzi OpenAI aggiornati (Dicembre 2024) - Verificati per accuratezza
export const OPENAI_PRICING = {
  'gpt-4o': {
    input: 0.0025,    // $0.0025 per 1K token di input
    output: 0.01      // $0.01 per 1K token di output
  },
  'gpt-4o-mini': {
    input: 0.00015,   // $0.00015 per 1K token di input
    output: 0.0006    // $0.0006 per 1K token di output
  },
  'gpt-4-turbo': {
    input: 0.01,      // $0.01 per 1K token di input
    output: 0.03      // $0.03 per 1K token di output
  },
  'gpt-4': {
    input: 0.03,      // $0.03 per 1K token di input
    output: 0.06      // $0.06 per 1K token di output
  },
  'gpt-3.5-turbo': {
    input: 0.0005,    // $0.0005 per 1K token di input (aggiornato)
    output: 0.0015    // $0.0015 per 1K token di output (aggiornato)
  }
};

// Piani enterprise personalizzati per il business multi-settore
export const ENTERPRISE_PRICING_TIERS = {
  starter: {
    name: 'Starter',
    price: 299,
    currency: 'EUR',
    features: ['1 chatbot', '10K msg/mese', 'Support email'],
    targetMargin: 0.88 // 88% margine tipico SaaS enterprise
  },
  professional: {
    name: 'Professional', 
    price: 699,
    currency: 'EUR',
    features: ['5 chatbot', '50K msg/mese', 'Analytics avanzate', 'Priority support'],
    targetMargin: 0.90
  },
  business: {
    name: 'Business',
    price: 1299,
    currency: 'EUR', 
    features: ['15 chatbot', '200K msg/mese', 'Multi-settore', 'Custom integrations'],
    targetMargin: 0.92
  },
  enterprise: {
    name: 'Enterprise',
    price: 2499,
    currency: 'EUR',
    features: ['Unlimited chatbot', 'Unlimited msg', 'White-label', 'Dedicated support'],
    targetMargin: 0.94
  },
  enterprise_plus: {
    name: 'Enterprise Plus',
    price: 4999,
    currency: 'EUR',
    features: ['On-premise', 'Custom AI models', '24/7 support', 'SLA garantito'],
    targetMargin: 0.95 // 95% margine per tier massimo
  }
};

export interface ApiUsageRecord {
  id?: string;
  timestamp: Date;
  userId?: string;
  clientId?: string;
  clientEmail?: string;      // EMAIL PRIMARIO per identificazione
  companyName?: string;      // Nome azienda del cliente
  conversationId?: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  responseTime: number;
  success: boolean;
  errorMessage?: string;
  endpoint: string;
  userMessage?: string;
  assistantResponse?: string;
  metadata?: {
    personality?: string;
    traits?: string[];
    hasUploadedFiles?: boolean;
    fileTypes?: string[];
    sector?: string;         // Settore cliente (e-commerce, healthcare, etc.)
    planType?: string;       // Piano attuale del cliente
    botCount?: number;       // Numero di bot utilizzati
  };
}

export interface CostSummary {
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
  averageCostPerRequest: number;
  averageTokensPerRequest: number;
  mostExpensiveRequest: number;
  period: {
    start: Date;
    end: Date;
  };
  breakdown: {
    byModel: Record<string, { cost: number; requests: number; tokens: number }>;
    byDay: Array<{ date: string; cost: number; requests: number }>;
    byHour: Array<{ hour: number; cost: number; requests: number }>;
  };
}

export interface ClientCostAnalysis {
  clientId: string;
  totalCost: number;
  totalRequests: number;
  averageCostPerRequest: number;
  dailyAverage: number;
  monthlyProjection: number;
  isOverBudget: boolean;
  suggestedPlan: string;
  riskLevel: 'low' | 'medium' | 'high';
  trends: {
    costTrend: 'increasing' | 'decreasing' | 'stable';
    usageTrend: 'increasing' | 'decreasing' | 'stable';
  };
}

class CostTracker {
  private collection: Collection<ApiUsageRecord> | null = null;

  private async getCollection(): Promise<Collection<ApiUsageRecord>> {
    if (!this.collection) {
      const client = await getMongoClient();
      this.collection = client.db().collection<ApiUsageRecord>('api_usage');
      
      // Crea indici per query performance
      await this.collection.createIndex({ timestamp: -1 });
      await this.collection.createIndex({ userId: 1, timestamp: -1 });
      await this.collection.createIndex({ clientId: 1, timestamp: -1 });
      await this.collection.createIndex({ clientEmail: 1, timestamp: -1 }); // Nuovo indice per email
      await this.collection.createIndex({ companyName: 1, timestamp: -1 }); // Nuovo indice per azienda
      await this.collection.createIndex({ conversationId: 1 });
      await this.collection.createIndex({ 'metadata.sector': 1 }); // Indice per settore
      await this.collection.createIndex({ 'metadata.planType': 1 }); // Indice per piano
    }
    return this.collection;
  }

  async trackApiUsage(usage: Omit<ApiUsageRecord, 'id' | 'timestamp'>): Promise<void> {
    try {
      const collection = await this.getCollection();
      const record: ApiUsageRecord = {
        ...usage,
        timestamp: new Date()
      };
      
      await collection.insertOne(record);
      console.log(`[CostTracker] Tracked API usage: $${usage.totalCost.toFixed(4)} for ${usage.totalTokens} tokens`);
    } catch (error) {
      console.error('[CostTracker] Error tracking API usage:', error);
    }
  }

  async getCostSummary(
    filters: {
      userId?: string;
      clientId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<CostSummary> {
    try {
      const collection = await this.getCollection();
      const matchStage: any = {};

      if (filters.userId) matchStage.userId = filters.userId;
      if (filters.clientId) matchStage.clientId = filters.clientId;
      
      const startDate = filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 giorni fa
      const endDate = filters.endDate || new Date();
      
      matchStage.timestamp = { $gte: startDate, $lte: endDate };

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalCost: { $sum: '$totalCost' },
            totalTokens: { $sum: '$totalTokens' },
            totalRequests: { $sum: 1 },
            averageCostPerRequest: { $avg: '$totalCost' },
            averageTokensPerRequest: { $avg: '$totalTokens' },
            mostExpensiveRequest: { $max: '$totalCost' },
            records: { $push: '$$ROOT' }
          }
        }
      ];

      const [result] = await collection.aggregate(pipeline).toArray();
      
      if (!result) {
        return this.getEmptyCostSummary(startDate, endDate);
      }

      // Calcola breakdown per modello
      const byModel: Record<string, { cost: number; requests: number; tokens: number }> = {};
      const byDay: Map<string, { cost: number; requests: number }> = new Map();
      const byHour: Array<{ hour: number; cost: number; requests: number }> = Array(24).fill(0).map((_, i) => ({ hour: i, cost: 0, requests: 0 }));

      result.records.forEach((record: ApiUsageRecord) => {
        // By model
        if (!byModel[record.model]) {
          byModel[record.model] = { cost: 0, requests: 0, tokens: 0 };
        }
        byModel[record.model].cost += record.totalCost;
        byModel[record.model].requests += 1;
        byModel[record.model].tokens += record.totalTokens;

        // By day
        const day = record.timestamp.toISOString().split('T')[0];
        if (!byDay.has(day)) {
          byDay.set(day, { cost: 0, requests: 0 });
        }
        const dayData = byDay.get(day)!;
        dayData.cost += record.totalCost;
        dayData.requests += 1;

        // By hour
        const hour = record.timestamp.getHours();
        byHour[hour].cost += record.totalCost;
        byHour[hour].requests += 1;
      });

      return {
        totalCost: result.totalCost,
        totalTokens: result.totalTokens,
        totalRequests: result.totalRequests,
        averageCostPerRequest: result.averageCostPerRequest,
        averageTokensPerRequest: result.averageTokensPerRequest,
        mostExpensiveRequest: result.mostExpensiveRequest,
        period: { start: startDate, end: endDate },
        breakdown: {
          byModel,
          byDay: Array.from(byDay.entries()).map(([date, data]) => ({ date, ...data })),
          byHour
        }
      };
    } catch (error) {
      console.error('[CostTracker] Error getting cost summary:', error);
      return this.getEmptyCostSummary(filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), filters.endDate || new Date());
    }
  }

  async getClientCostAnalysis(clientId: string): Promise<ClientCostAnalysis> {
    try {
      const collection = await this.getCollection();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Dati ultimi 30 giorni
      const monthlyData = await collection.find({
        clientId,
        timestamp: { $gte: thirtyDaysAgo }
      }).toArray();

      // Dati ultimi 7 giorni
      const weeklyData = await collection.find({
        clientId,
        timestamp: { $gte: sevenDaysAgo }
      }).toArray();

      const totalCost = monthlyData.reduce((sum, record) => sum + record.totalCost, 0);
      const totalRequests = monthlyData.length;
      const averageCostPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0;
      const dailyAverage = totalCost / 30;
      const monthlyProjection = dailyAverage * 30;

      // Calcola trend
      const firstWeekCost = monthlyData.filter(r => r.timestamp >= new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) && r.timestamp < sevenDaysAgo)
        .reduce((sum, record) => sum + record.totalCost, 0);
      const lastWeekCost = weeklyData.reduce((sum, record) => sum + record.totalCost, 0);

      let costTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (lastWeekCost > firstWeekCost * 1.1) costTrend = 'increasing';
      else if (lastWeekCost < firstWeekCost * 0.9) costTrend = 'decreasing';

      const usageTrend = costTrend; // Semplificato per ora

      // Determina risk level e piano suggerito
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      let suggestedPlan = 'Basic';
      let isOverBudget = false;

      if (monthlyProjection > 50) {
        riskLevel = 'high';
        suggestedPlan = 'Enterprise';
        isOverBudget = true;
      } else if (monthlyProjection > 20) {
        riskLevel = 'medium'; 
        suggestedPlan = 'Professional';
      } else if (monthlyProjection > 5) {
        suggestedPlan = 'Standard';
      }

      return {
        clientId,
        totalCost,
        totalRequests,
        averageCostPerRequest,
        dailyAverage,
        monthlyProjection,
        isOverBudget,
        suggestedPlan,
        riskLevel,
        trends: {
          costTrend,
          usageTrend
        }
      };
    } catch (error) {
      console.error('[CostTracker] Error getting client cost analysis:', error);
      return {
        clientId,
        totalCost: 0,
        totalRequests: 0,
        averageCostPerRequest: 0,
        dailyAverage: 0,
        monthlyProjection: 0,
        isOverBudget: false,
        suggestedPlan: 'Basic',
        riskLevel: 'low',
        trends: {
          costTrend: 'stable',
          usageTrend: 'stable'
        }
      };
    }
  }

  async getTopSpendingClients(limit: number = 10): Promise<Array<{ clientId: string; clientEmail?: string; companyName?: string; sector?: string; totalCost: number; totalRequests: number }>> {
    try {
      const collection = await this.getCollection();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const pipeline = [
        { $match: { timestamp: { $gte: thirtyDaysAgo }, $or: [{ clientId: { $exists: true } }, { clientEmail: { $exists: true } }] } },
        {
          $group: {
            _id: {
              clientId: '$clientId',
              clientEmail: '$clientEmail',
              companyName: '$companyName'
            },
            totalCost: { $sum: '$totalCost' },
            totalRequests: { $sum: 1 },
            sector: { $first: '$metadata.sector' },
            planType: { $first: '$metadata.planType' }
          }
        },
        { $sort: { totalCost: -1 } },
        { $limit: limit },
        {
          $project: {
            clientId: '$_id.clientId',
            clientEmail: '$_id.clientEmail', 
            companyName: '$_id.companyName',
            sector: 1,
            planType: 1,
            totalCost: 1,
            totalRequests: 1,
            _id: 0
          }
        }
      ];

      return (await collection.aggregate(pipeline).toArray()) as any;
    } catch (error) {
      console.error('[CostTracker] Error getting top spending clients:', error);
      return [];
    }
  }

  private getEmptyCostSummary(startDate: Date, endDate: Date): CostSummary {
    return {
      totalCost: 0,
      totalTokens: 0,
      totalRequests: 0,
      averageCostPerRequest: 0,
      averageTokensPerRequest: 0,
      mostExpensiveRequest: 0,
      period: { start: startDate, end: endDate },
      breakdown: {
        byModel: {},
        byDay: [],
        byHour: Array(24).fill(0).map((_, i) => ({ hour: i, cost: 0, requests: 0 }))
      }
    };
  }
}

// Calcola il costo basato sui token e modello
export function calculateApiCost(model: string, inputTokens: number, outputTokens: number): { inputCost: number; outputCost: number; totalCost: number } {
  const pricing = OPENAI_PRICING[model as keyof typeof OPENAI_PRICING] || OPENAI_PRICING['gpt-3.5-turbo'];
  
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  const totalCost = inputCost + outputCost;

  return { inputCost, outputCost, totalCost };
}

// Singleton instance
export const costTracker = new CostTracker();
