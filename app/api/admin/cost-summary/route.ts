import { NextRequest, NextResponse } from 'next/server';
import { costTracker } from '@/backend/lib/costTracking';

// Chiave di accesso admin semplice (in produzione usare auth più robusto)
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-k2m4x9-secret';

function verifyAdminAccess(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const secret = request.headers.get('x-admin-secret');
  
  return secret === ADMIN_SECRET || authHeader === `Bearer ${ADMIN_SECRET}`;
}

export async function GET(request: NextRequest) {
  try {
    // Verifica accesso admin
    if (!verifyAdminAccess(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const clientId = searchParams.get('clientId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const filters: any = {};
    if (userId) filters.userId = userId;
    if (clientId) filters.clientId = clientId;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const costSummary = await costTracker.getCostSummary(filters);

    return NextResponse.json({
      success: true,
      data: costSummary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Admin API] Error getting cost summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
