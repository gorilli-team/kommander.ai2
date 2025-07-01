import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/backend/lib/mongodb';
import type { ChatbotSettingsDocument } from '@/backend/schemas/settings';

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

export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!userId) {
    return addCorsHeaders(NextResponse.json({ error: 'Missing userId' }, { status: 400 }));
  }
  const { db } = await connectToDatabase();
  const doc = await db.collection<ChatbotSettingsDocument>('chatbot_settings').findOne({ userId });
  return addCorsHeaders(NextResponse.json(doc || {}));
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
