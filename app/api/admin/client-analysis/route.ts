import { NextRequest, NextResponse } from 'next/server';
import { costTracker } from '@/backend/lib/costTracking';

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
    const clientId = searchParams.get('clientId');

    if (clientId) {
      // Analisi per un cliente specifico
      const analysis = await costTracker.getClientCostAnalysis(clientId);
      return NextResponse.json({
        success: true,
        data: analysis,
        timestamp: new Date().toISOString()
      });
    } else {
      // Top spending clients
      const limit = parseInt(searchParams.get('limit') || '20');
      const topClients = await costTracker.getTopSpendingClients(limit);
      
      // Analisi dettagliata per tutti i top clients
      const detailedAnalyses = await Promise.all(
        topClients.map(client => costTracker.getClientCostAnalysis(client.clientId))
      );

      return NextResponse.json({
        success: true,
        data: {
          topClients,
          detailedAnalyses,
          summary: {
            totalClients: topClients.length,
            totalCost: topClients.reduce((sum, client) => sum + client.totalCost, 0),
            averageCostPerClient: topClients.reduce((sum, client) => sum + client.totalCost, 0) / topClients.length || 0,
            highRiskClients: detailedAnalyses.filter(a => a.riskLevel === 'high').length,
            mediumRiskClients: detailedAnalyses.filter(a => a.riskLevel === 'medium').length,
            lowRiskClients: detailedAnalyses.filter(a => a.riskLevel === 'low').length
          }
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('[Admin API] Error getting client analysis:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
