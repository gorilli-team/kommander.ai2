import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/backend/lib/mongodb';
import type { ChatbotSettingsDocument } from '@/backend/schemas/settings';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

// Add CORS headers for cross-origin requests from external websites
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }));
}

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!userId) {
    return addCorsHeaders(NextResponse.json({ error: 'Missing userId' }, { status: 400 }));
  }
  const { db } = await connectToDatabase();
  const doc = await db.collection<ChatbotSettingsDocument>('chatbot_settings').findOne({ userId });

  const body = JSON.stringify(doc || {});
  const etag = 'W/"' + crypto.createHash('sha1').update(body).digest('base64') + '"';

  // Admin can force-fresh via ?fresh=1 to bypass caches completely
  const fresh = new URL(req.url).searchParams.get('fresh');
  if (fresh === '1' || fresh === 'true') {
    const res = new NextResponse(body, { status: 200 });
    res.headers.set('Content-Type', 'application/json');
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    // Still add ETag for consistency, but it won't be cached client-side due to no-store
    res.headers.set('ETag', etag);
    return addCorsHeaders(res);
  }

  // If client sent an ETag and it matches, return 304
  const ifNoneMatch = req.headers.get('if-none-match');
  if (ifNoneMatch && ifNoneMatch === etag) {
    const res = new NextResponse(null, { status: 304 });
    res.headers.set('ETag', etag);
    // Revalidate on every request to ensure instant updates for the widget
    res.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    return addCorsHeaders(res);
  }

  const res = new NextResponse(body, { status: 200 });
  res.headers.set('Content-Type', 'application/json');
  res.headers.set('ETag', etag);
  // Revalidate on every request to ensure instant updates for the widget
  res.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  return addCorsHeaders(res);
}

export async function PUT(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!userId) {
    return addCorsHeaders(NextResponse.json({ error: 'Missing userId' }, { status: 400 }));
  }
  
  const settings = await req.json();
  const { db } = await connectToDatabase();
  
  await db.collection<ChatbotSettingsDocument>('chatbot_settings')
    .updateOne(
      { userId },
      { $set: { ...settings, userId, updatedAt: new Date() } },
      { upsert: true }
    );
  
  return addCorsHeaders(NextResponse.json({ success: true }));
}
