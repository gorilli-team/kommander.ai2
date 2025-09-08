import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { connectToDatabase } from '@/backend/lib/mongodb';

// DEV-ONLY: backfill analytics_events from conversations for the current user
export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const force = req.nextUrl.searchParams.get('force') === 'true';
    const days = Math.min(parseInt(req.nextUrl.searchParams.get('days') || '90'), 365);

    const { db } = await connectToDatabase();

    // Safety: don't duplicate if there are already events for this user
    const existing = await db.collection('analytics_events').findOne({ userId: session.user.id });
    if (existing && !force) {
      return NextResponse.json({
        message: 'Existing analytics_events found for this user. Re-run with ?force=true to backfill anyway.'
      }, { status: 409 });
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const conversations = await db.collection('conversations')
      .find({ userId: session.user.id, $or: [ { createdAt: { $gte: since } }, { createdAt: { $exists: false } } ] })
      .toArray();

    const docs: any[] = [];

    for (const conv of conversations) {
      const messages = (conv.messages || []) as Array<{ role: string; text?: string; content?: string; timestamp: Date }>;
      const createdAt = conv.createdAt || (messages[0]?.timestamp ? new Date(messages[0].timestamp) : new Date());

      // conversation_started
      docs.push({
        userId: session.user.id,
        type: 'conversation_started',
        timestamp: createdAt,
        metadata: {
          conversationId: conv.conversationId || conv._id?.toString(),
        }
      });

      // message_sent / response_generated
      let lastUserTs: Date | null = null;
      for (const m of messages) {
        const ts = new Date(m.timestamp);
        if (m.role === 'user') {
          lastUserTs = ts;
          docs.push({
            userId: session.user.id,
            type: 'message_sent',
            timestamp: ts,
            metadata: {
              conversationId: conv.conversationId || conv._id?.toString(),
              messageLength: (m.text ?? m.content ?? '').length
            }
          });
        } else if (m.role === 'assistant') {
          const responseTime = lastUserTs ? (ts.getTime() - lastUserTs.getTime()) : undefined;
          docs.push({
            userId: session.user.id,
            type: 'response_generated',
            timestamp: ts,
            metadata: {
              conversationId: conv.conversationId || conv._id?.toString(),
              responseTime
            }
          });
        }
      }
    }

    let inserted = 0;
    if (docs.length > 0) {
      const result = await db.collection('analytics_events').insertMany(docs);
      inserted = result.insertedCount || Object.keys(result.insertedIds || {}).length || 0;
    }

    return NextResponse.json({ conversations: conversations.length, inserted, days });
  } catch (error) {
    console.error('Error backfilling analytics:', error);
    return NextResponse.json({ error: 'Failed to backfill analytics' }, { status: 500 });
  }
}

