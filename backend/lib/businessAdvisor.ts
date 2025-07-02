import { createTrackedChatCompletion } from './openai';
import { costTracker, ClientCostAnalysis } from './costTracking';

export interface PricingRecommendation {
  recommendedPlan: string;
  suggestedPrice: number;
  reasoning: string;
  marketAnalysis: string;
  profitMargin: number;
  riskAssessment: string;
  competitorComparison: string;
  recommendations: string[];
}

export interface BusinessInsight {
  type: 'opportunity' | 'warning' | 'optimization' | 'growth';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionItems: string[];
  estimatedROI?: string;
}

export interface MarketAnalysis {
  averageIndustryPrice: number;
  positioningRecommendation: string;
  competitiveAdvantages: string[];
  marketTrends: string[];
  pricingStrategy: string;
}

class BusinessAdvisor {
  async getPricingRecommendations(
    costData: ClientCostAnalysis[],
    currentPlans: Array<{ name: string; price: number; features: string[] }> = []
  ): Promise<PricingRecommendation[]> {
    try {
      const totalClients = costData.length;
      const avgCostPerClient = costData.reduce((sum, client) => sum + client.monthlyProjection, 0) / totalClients || 0;
      const highRiskClients = costData.filter(c => c.riskLevel === 'high').length;
      const profitableClients = costData.filter(c => c.monthlyProjection < 10).length;

      const prompt = `
Sei un esperto consulente di business e pricing strategy per KOMMANDER.AI - una piattaforma SaaS enterprise di chatbot AI multi-settore.

CONTESTO BUSINESS:
- TARGET: Clienti enterprise multi-settore (e-commerce, healthcare, legal, finance, etc.)
- POSIZIONAMENTO: Premium enterprise con piani da €299 a €4999
- COMPETITOR PRINCIPALE: Keplero AI (Italia) - analizza competitive gap
- MARGINI TARGET: 88-95% tipici SaaS enterprise
- FASE: Startup in crescita con focus su high-value clients

DATI ANALIZZATI:
- Totale clienti enterprise: ${totalClients}
- Costo medio API per cliente/mese: $${avgCostPerClient.toFixed(2)}
- Clienti high-usage (target ideale): ${highRiskClients}
- Clienti low-usage (possibili upgrade): ${profitableClients}

PIANI ENTERPRISE ATTUALI:
${currentPlans.map(plan => `- ${plan.name}: €${plan.price}/mese`).join('\n')}

ANALIZZA e fornisci strategia enterprise specifica:
1. Pricing optimization per mercato italiano enterprise
2. Competitive analysis vs Keplero AI
3. Strategie di differenziazione multi-settore
4. Bundle pricing per clienti con multiple vertical
5. Margini ottimali per sostenibilità e crescita
6. Strategie per ridurre costi API e aumentare ARPU

Rispondi in formato JSON con questa struttura:
{
  "plans": [
    {
      "name": "Piano Enterprise",
      "suggestedPrice": numero_euro,
      "reasoning": "motivo specifico per enterprise",
      "targetMargin": numero_percentuale,
      "competitiveAdvantage": "vs Keplero AI"
    }
  ],
  "marketAnalysis": {
    "enterpriseAverage": numero_euro,
    "positioning": "strategia vs Keplero",
    "trends": ["trend enterprise specifici"],
    "kepleCompetitiveGap": "opportunità vs competitor"
  },
  "optimizations": ["suggerimenti enterprise-specific"],
  "riskAssessment": "valutazione per business enterprise"
}
`;

      const completion = await createTrackedChatCompletion(
        {
          model: 'gpt-4-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2000
        },
        {
          endpoint: 'business-advisor-pricing',
          userMessage: 'Pricing analysis request',
          metadata: {
            totalClients: totalClients,
            avgCost: avgCostPerClient
          }
        }
      );

      const response = completion.choices[0]?.message?.content;
      if (!response) throw new Error('No response from AI advisor');

      // Parse JSON response
      const analysis = JSON.parse(response);
      
      return analysis.plans.map((plan: any) => ({
        recommendedPlan: plan.name,
        suggestedPrice: plan.suggestedPrice,
        reasoning: plan.reasoning,
        marketAnalysis: analysis.marketAnalysis.positioning,
        profitMargin: plan.targetMargin,
        riskAssessment: analysis.riskAssessment,
        competitorComparison: analysis.marketAnalysis.industryAverage,
        recommendations: analysis.optimizations
      }));

    } catch (error) {
      console.error('[BusinessAdvisor] Error getting pricing recommendations:', error);
      return this.getFallbackRecommendations(costData);
    }
  }

  async getBusinessInsights(costSummary: any, clientAnalyses: ClientCostAnalysis[]): Promise<BusinessInsight[]> {
    try {
      const insights: BusinessInsight[] = [];

      // Analisi automatica
      if (costSummary.totalCost > 1000) {
        insights.push({
          type: 'warning',
          title: 'Costi API Elevati',
          description: `I costi API totali sono di $${costSummary.totalCost.toFixed(2)}, superiori alla soglia di sicurezza.`,
          impact: 'high',
          actionItems: [
            'Implementare rate limiting più aggressivo',
            'Ottimizzare i prompt per ridurre token',
            'Considerare modelli più economici per query semplici'
          ]
        });
      }

      const growingClients = clientAnalyses.filter(c => c.trends.costTrend === 'increasing').length;
      if (growingClients > clientAnalyses.length * 0.3) {
        insights.push({
          type: 'opportunity',
          title: 'Crescita Usage Clienti',
          description: `${growingClients} clienti stanno aumentando l'utilizzo, opportunità di upselling.`,
          impact: 'high',
          actionItems: [
            'Contattare clienti per upgrade piano',
            'Proporre piani enterprise personalizzati',
            'Implementare notifiche proattive usage'
          ],
          estimatedROI: '150-300%'
        });
      }

      // Usa AI per insights più sofisticati
      const aiInsights = await this.getAIGeneratedInsights(costSummary, clientAnalyses);
      insights.push(...aiInsights);

      return insights;
    } catch (error) {
      console.error('[BusinessAdvisor] Error getting business insights:', error);
      return [];
    }
  }

  private async getAIGeneratedInsights(costSummary: any, clientAnalyses: ClientCostAnalysis[]): Promise<BusinessInsight[]> {
    const prompt = `
Analizza questi dati di business per un SaaS di chatbot AI:

RIASSUNTO COSTI:
- Costo totale: $${costSummary.totalCost}
- Richieste totali: ${costSummary.totalRequests}
- Costo medio per richiesta: $${costSummary.averageCostPerRequest}

ANALISI CLIENTI:
${clientAnalyses.slice(0, 10).map(c => `
Cliente ${c.clientId}: $${c.totalCost}/mese, trend: ${c.trends.costTrend}, risk: ${c.riskLevel}
`).join('')}

Identifica 3-5 insight strategici importanti per il business. Per ogni insight, fornisci:
- Tipo (opportunity/warning/optimization/growth)
- Titolo breve
- Descrizione dettagliata
- Impatto (high/medium/low)
- 2-3 azioni concrete
- ROI stimato se applicabile

Formato JSON:
{
  "insights": [
    {
      "type": "opportunity",
      "title": "Titolo",
      "description": "Descrizione",
      "impact": "high",
      "actionItems": ["azione1", "azione2"],
      "estimatedROI": "50-100%"
    }
  ]
}
`;

    try {
      const completion = await createTrackedChatCompletion(
        {
          model: 'gpt-4-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          max_tokens: 1500
        },
        {
          endpoint: 'business-advisor-insights',
          userMessage: 'Business insights analysis'
        }
      );

      const response = completion.choices[0]?.message?.content;
      if (!response) return [];

      const analysis = JSON.parse(response);
      return analysis.insights || [];
    } catch (error) {
      console.error('[BusinessAdvisor] Error generating AI insights:', error);
      return [];
    }
  }

  async getMarketAnalysis(): Promise<MarketAnalysis> {
    try {
      const prompt = `
Fornisci un'analisi di mercato aggiornata per SaaS di chatbot AI nel 2024.

Includi:
1. Prezzo medio di mercato per piani base/pro/enterprise
2. Principali competitor e loro prezzi
3. Trend di mercato attuali
4. Vantaggi competitivi da enfatizzare
5. Strategia di posizionamento ottimale

Rispondi in JSON:
{
  "averageIndustryPrice": numero,
  "positioningRecommendation": "strategia",
  "competitiveAdvantages": ["vantaggio1", "vantaggio2"],
  "marketTrends": ["trend1", "trend2"],
  "pricingStrategy": "strategia pricing",
  "competitors": [
    {"name": "competitor", "price": numero, "positioning": "descrizione"}
  ]
}
`;

      const completion = await createTrackedChatCompletion(
        {
          model: 'gpt-4-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.6,
          max_tokens: 1000
        },
        {
          endpoint: 'business-advisor-market',
          userMessage: 'Market analysis request'
        }
      );

      const response = completion.choices[0]?.message?.content;
      if (!response) throw new Error('No market analysis response');

      const analysis = JSON.parse(response);
      return {
        averageIndustryPrice: analysis.averageIndustryPrice || 50,
        positioningRecommendation: analysis.positioningRecommendation,
        competitiveAdvantages: analysis.competitiveAdvantages || [],
        marketTrends: analysis.marketTrends || [],
        pricingStrategy: analysis.pricingStrategy
      };
    } catch (error) {
      console.error('[BusinessAdvisor] Error getting market analysis:', error);
      return this.getFallbackMarketAnalysis();
    }
  }

  async getCostOptimizationSuggestions(costSummary: any): Promise<string[]> {
    try {
      const prompt = `
Analizza questi dati di costo API OpenAI e suggerisci ottimizzazioni:

- Costo totale: $${costSummary.totalCost}
- Token totali: ${costSummary.totalTokens}
- Richieste: ${costSummary.totalRequests}
- Costo medio per richiesta: $${costSummary.averageCostPerRequest}

Modelli utilizzati:
${Object.entries(costSummary.breakdown.byModel).map(([model, data]: [string, any]) => 
  `- ${model}: $${data.cost} (${data.requests} richieste)`
).join('\n')}

Fornisci 5-7 suggerimenti concreti per ottimizzare i costi, ordinati per impatto potenziale.

Formato JSON: {"suggestions": ["suggerimento1", "suggerimento2", ...]}
`;

      const completion = await createTrackedChatCompletion(
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 800
        },
        {
          endpoint: 'business-advisor-optimization',
          userMessage: 'Cost optimization analysis'
        }
      );

      const response = completion.choices[0]?.message?.content;
      if (!response) return this.getFallbackOptimizations();

      const analysis = JSON.parse(response);
      return analysis.suggestions || this.getFallbackOptimizations();
    } catch (error) {
      console.error('[BusinessAdvisor] Error getting optimization suggestions:', error);
      return this.getFallbackOptimizations();
    }
  }

  private getFallbackRecommendations(costData: ClientCostAnalysis[]): PricingRecommendation[] {
    const avgCost = costData.reduce((sum, client) => sum + client.monthlyProjection, 0) / costData.length || 5;
    
    return [
      {
        recommendedPlan: 'Basic',
        suggestedPrice: Math.max(avgCost * 3, 15),
        reasoning: 'Piano base con margine di sicurezza per costi API',
        marketAnalysis: 'Competitivo nel mercato entry-level',
        profitMargin: 0.7,
        riskAssessment: 'Basso rischio, margine adeguato',
        competitorComparison: 'In linea con competitor simili',
        recommendations: ['Monitorare uso API', 'Limitare richieste/ora']
      },
      {
        recommendedPlan: 'Professional',
        suggestedPrice: Math.max(avgCost * 5, 35),
        reasoning: 'Piano intermedio con funzionalità avanzate',
        marketAnalysis: 'Ottimo rapporto qualità-prezzo',
        profitMargin: 0.8,
        riskAssessment: 'Rischio moderato, buoni margini',
        competitorComparison: 'Competitivo con valore aggiunto',
        recommendations: ['Analytics avanzati', 'Supporto prioritario']
      }
    ];
  }

  private getFallbackMarketAnalysis(): MarketAnalysis {
    return {
      averageIndustryPrice: 899, // Prezzo medio enterprise nel mercato italiano
      positioningRecommendation: 'Posizionarsi come premium enterprise solution multi-settore vs Keplero AI focalizzato su PMI. Emphasis su trasparenza costi, business intelligence avanzata e scalabilità enterprise.',
      competitiveAdvantages: [
        'Tracciamento automatico dei costi AI con prezzi aggiornati 2024',
        'Business intelligence enterprise multi-settore',
        'Dashboard admin completa vs Keplero AI limitata',
        'Ottimizzazione automatica costi con margini SaaS 88-95%',
        'Supporto multi-cliente con identificazione email-first',
        'Integrazione WhatsApp nativa (vs Keplero AI basic)',
        'Piani enterprise scalabili €299-€4999',
        'Analytics avanzate per e-commerce, healthcare, legal, finance'
      ],
      marketTrends: [
        'Crescita del 60% nel mercato chatbot enterprise italiano',
        'Keplero AI focalizzato su PMI, noi su Enterprise',
        'Aumento domanda soluzioni multi-settore vs single-vertical',
        'Focus su trasparenza costi API (nostro vantaggio vs Keplero)',
        'Integrazione nativa WhatsApp sempre più richiesta',
        'Cliente enterprise preferisce email-based identification'
      ],
      pricingStrategy: 'Value-based pricing enterprise €299-€4999 vs Keplero €49-€299. Target margini SaaS tipici 88-95% vs competitor con margini più bassi.'
    };
  }

  private getFallbackOptimizations(): string[] {
    return [
      'Implementare caching delle risposte comuni',
      'Usare GPT-3.5-turbo per query semplici',
      'Ottimizzare lunghezza dei prompt',
      'Implementare rate limiting per utente',
      'Comprimere contesto delle conversazioni lunghe',
      'Usare embedding per ricerca documenti invece di includere tutto nel prompt'
    ];
  }
}

export const businessAdvisor = new BusinessAdvisor();
