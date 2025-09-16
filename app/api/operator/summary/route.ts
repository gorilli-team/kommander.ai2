import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { connectToDatabase } from '@/backend/lib/mongodb';
import { ObjectId } from 'mongodb';
import { organizationService } from '@/backend/lib/organizationService';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contextType = request.headers.get('x-context-type') || 'personal';
    const orgId = request.headers.get('x-organization-id') || undefined;

    const { db } = await connectToDatabase();

    let filter: any = {};

    if (contextType === 'organization') {
      if (!orgId) return NextResponse.json({ error: 'Missing organization context' }, { status: 400 });

      const permitted = await organizationService.hasPermission(
        session.user.id,
        orgId,
        'read_conversations' as any
      );
      if (!permitted) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

      const members = await db
        .collection('organization_members')
        .find({ organizationId: new ObjectId(orgId), status: 'active' })
        .project({ userId: 1 })
        .toArray();
      const memberUserIds = members.map((m: any) => m.userId.toString());
      if (memberUserIds.length === 0) {
        return NextResponse.json({
          totals: { totalConversations: 0, botHandled: 0, agentHandled: 0 },
          timeframe: { last7Days: 0 },
          knowledge: { faqCount: 0, documentsCount: 0 },
        });
      }
      filter.userId = { $in: memberUserIds };

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const [totalConversations, botHandled, agentHandled, last7Days, faqCount, documentsCount] = await Promise.all([
        db.collection('conversations').countDocuments(filter),
        db.collection('conversations').countDocuments({ ...filter, handledBy: 'bot' }),
        db.collection('conversations').countDocuments({ ...filter, handledBy: 'agent' }),
        db.collection('conversations').countDocuments({ ...filter, updatedAt: { $gte: oneWeekAgo } }),
        db.collection('faqs').countDocuments({ organizationId: new ObjectId(orgId) }),
        db.collection('raw_files_meta').countDocuments({ organizationId: new ObjectId(orgId) }),
      ]);

      return NextResponse.json({
        totals: { totalConversations, botHandled, agentHandled },
        timeframe: { last7Days },
        knowledge: { faqCount, documentsCount },
      });
    }

    // Personal context fallback
    filter.userId = session.user.id;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [totalConversations, botHandled, agentHandled, last7Days, faqCount, documentsCount] = await Promise.all([
      db.collection('conversations').countDocuments(filter),
      db.collection('conversations').countDocuments({ ...filter, handledBy: 'bot' }),
      db.collection('conversations').countDocuments({ ...filter, handledBy: 'agent' }),
      db.collection('conversations').countDocuments({ ...filter, updatedAt: { $gte: oneWeekAgo } }),
      db.collection('faqs').countDocuments({ userId: session.user.id }),
      db.collection('raw_files_meta').countDocuments({ userId: session.user.id }),
    ]);

    return NextResponse.json({
      totals: { totalConversations, botHandled, agentHandled },
      timeframe: { last7Days },
      knowledge: { faqCount, documentsCount },
    });
  } catch (error) {
    console.error('[api/operator/summary] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
