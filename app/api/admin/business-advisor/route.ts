import { NextRequest, NextResponse } from 'next/server';
import { costTracker } from '@/backend/lib/costTracking';
import { businessAdvisor } from '@/backend/lib/businessAdvisor';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-k2m4x9-secret';

function verifyAdminAccess(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const secret = request.headers.get('x-admin-secret');
  
  return secret === ADMIN_SECRET || authHeader === `Bearer ${ADMIN_SECRET}`;
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminAccess(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'pricing';

    switch (action) {
      case 'pricing': {
        // Ottieni dati sui clienti per analisi pricing
        const topClients = await costTracker.getTopSpendingClients(50);
        const clientAnalyses = await Promise.all(
          topClients.map(client => costTracker.getClientCostAnalysis(client.clientId))
        );

        const pricingRecommendations = await businessAdvisor.getPricingRecommendations(
          clientAnalyses,
          [
            { name: 'Basic', price: 19, features: ['100 messages/month', 'Basic support'] },
            { name: 'Pro', price: 49, features: ['1000 messages/month', 'Priority support', 'Analytics'] },
            { name: 'Enterprise', price: 99, features: ['Unlimited', 'Custom features', 'Dedicated support'] }
          ]
        );

        return NextResponse.json({
          success: true,
          data: {
            recommendations: pricingRecommendations,
            clientData: {
              totalAnalyzed: clientAnalyses.length,
              averageCost: clientAnalyses.reduce((sum, c) => sum + c.monthlyProjection, 0) / clientAnalyses.length,
              riskDistribution: {
                high: clientAnalyses.filter(c => c.riskLevel === 'high').length,
                medium: clientAnalyses.filter(c => c.riskLevel === 'medium').length,
                low: clientAnalyses.filter(c => c.riskLevel === 'low').length
              }
            }
          }
        });
      }

      case 'insights': {
        const costSummary = await costTracker.getCostSummary();
        const topClients = await costTracker.getTopSpendingClients(20);
        const clientAnalyses = await Promise.all(
          topClients.map(client => costTracker.getClientCostAnalysis(client.clientId))
        );

        const insights = await businessAdvisor.getBusinessInsights(costSummary, clientAnalyses);

        return NextResponse.json({
          success: true,
          data: {
            insights,
            summary: {
              totalCost: costSummary.totalCost,
              totalClients: clientAnalyses.length,
              highImpactInsights: insights.filter(i => i.impact === 'high').length
            }
          }
        });
      }

      case 'market': {
        const marketAnalysis = await businessAdvisor.getMarketAnalysis();

        return NextResponse.json({
          success: true,
          data: marketAnalysis
        });
      }

      case 'optimization': {
        const costSummary = await costTracker.getCostSummary();
        const suggestions = await businessAdvisor.getCostOptimizationSuggestions(costSummary);

        return NextResponse.json({
          success: true,
          data: {
            suggestions,
            currentCosts: {
              total: costSummary.totalCost,
              averagePerRequest: costSummary.averageCostPerRequest,
              totalRequests: costSummary.totalRequests
            },
            potentialSavings: Math.min(costSummary.totalCost * 0.3, 500) // Stima 30% di risparmio potenziale
          }
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Admin API] Business advisor error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyAdminAccess(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'analyze-custom-scenario': {
        // Analizza uno scenario personalizzato
        const { customerCount, avgUsage, targetMargin } = data;
        
        // Calcola costi stimati
        const estimatedMonthlyCost = customerCount * avgUsage * 0.002; // Stima basata su GPT-3.5
        const requiredRevenue = estimatedMonthlyCost / (1 - targetMargin);
        const suggestedPricePerCustomer = requiredRevenue / customerCount;

        return NextResponse.json({
          success: true,
          data: {
            scenario: {
              customerCount,
              avgUsage,
              targetMargin,
              estimatedMonthlyCost,
              requiredRevenue,
              suggestedPricePerCustomer
            },
            recommendations: [
              `Prezzo suggerito per cliente: $${suggestedPricePerCustomer.toFixed(2)}/mese`,
              `Costo stimato totale: $${estimatedMonthlyCost.toFixed(2)}/mese`,
              `Revenue necessario: $${requiredRevenue.toFixed(2)}/mese`,
              `Margine di profitto: ${(targetMargin * 100).toFixed(1)}%`
            ]
          }
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Admin API] Business advisor POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
