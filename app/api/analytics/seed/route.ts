import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { connectToDatabase } from '@/backend/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    const params = req.nextUrl.searchParams;
    const days = Math.min(parseInt(params.get('days') || '7'), 30);
    const perDay = Math.min(parseInt(params.get('perDay') || '25'), 200);

    const now = new Date();
    const docs: any[] = [];

    for (let d = 0; d < days; d++) {
      const dayDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
      for (let i = 0; i < perDay; i++) {
        const baseTs = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
        // conversation_started
        docs.push({
          userId: session.user.id,
          type: 'conversation_started',
          timestamp: baseTs,
          metadata: {
            sessionId: `sess_${d}_${i}`,
            page: ['/','/chatbot','/pricing','/docs'][Math.floor(Math.random()*4)]
          }
        });
        // message_sent
        const msgCount = 1 + Math.floor(Math.random()*5);
        for (let m = 0; m < msgCount; m++) {
          docs.push({
            userId: session.user.id,
            type: 'message_sent',
            timestamp: new Date(baseTs.getTime() + m * 20000 + Math.floor(Math.random()*10000)),
            metadata: {
              messageLength: 5 + Math.floor(Math.random()*200),
              sessionId: `sess_${d}_${i}`
            }
          });
          // response_generated
          docs.push({
            userId: session.user.id,
            type: 'response_generated',
            timestamp: new Date(baseTs.getTime() + m * 20000 + Math.floor(Math.random()*10000) + 1500),
            metadata: {
              responseTime: 500 + Math.floor(Math.random()*6000),
              tokensUsed: 50 + Math.floor(Math.random()*500)
            }
          });
        }
        // source_used (faq/document)
        const sourceEvents = 1 + Math.floor(Math.random()*2);
        for (let s = 0; s < sourceEvents; s++) {
          docs.push({
            userId: session.user.id,
            type: 'source_used',
            timestamp: new Date(baseTs.getTime() + 60000 + s*10000),
            metadata: {
              sourceType: Math.random() > 0.5 ? 'faq' : 'document',
              sourceId: `src_${Math.floor(Math.random()*20)}`
            }
          });
        }
        // occasional rating
        if (Math.random() > 0.6) {
          docs.push({
            userId: session.user.id,
            type: 'conversation_rated',
            timestamp: new Date(baseTs.getTime() + 120000),
            metadata: {
              rating: 3 + Math.floor(Math.random()*3)
            }
          });
        }
        // occasional error
        if (Math.random() > 0.8) {
          docs.push({
            userId: session.user.id,
            type: 'error_occurred',
            timestamp: new Date(baseTs.getTime() + 30000),
            metadata: {
              errorType: ['timeout','rate_limit','bad_request'][Math.floor(Math.random()*3)]
            }
          });
        }
      }
    }

    if (docs.length > 0) {
      await db.collection('analytics_events').insertMany(docs);
    }

    return NextResponse.json({ inserted: docs.length, days, perDay });
  } catch (error) {
    console.error('Error seeding analytics events:', error);
    return NextResponse.json({ error: 'Failed to seed analytics' }, { status: 500 });
  }
}

