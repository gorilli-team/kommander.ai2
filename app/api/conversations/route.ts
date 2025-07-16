import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { connectToDatabase } from '@/backend/lib/mongodb';
import { getContextInfo } from '@/backend/lib/contextHelpers';
import type { ConversationDocument } from '@/backend/schemas/conversation';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');
    const search = searchParams.get('search');

    // Get context info to determine if we should filter by organization
    const { context, organizationId } = await getContextInfo();
    
    console.log('[API /conversations] Context:', context, 'OrganizationId:', organizationId, 'UserId:', session.user.id);

    const { db } = await connectToDatabase();
    
    // Use organization ID if in organization context, otherwise use user ID
    const contextId = context === 'organization' && organizationId ? organizationId : session.user.id;

    // Build query filter
    let filter: any = { userId: contextId };
    
    if (search) {
      filter.$or = [
        { 'messages.text': { $regex: search, $options: 'i' } },
        { 'messages.content': { $regex: search, $options: 'i' } },
        { site: { $regex: search, $options: 'i' } }
      ];
    }

    const conversations = await db
      .collection<ConversationDocument>('conversations')
      .find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Format conversations for the client
    const formattedConversations = conversations.map((doc) => ({
      id: doc.conversationId,
      handledBy: doc.handledBy ?? 'bot',
      messages: doc.messages.map((m) => ({
        role: m.role,
        text: m.text || m.content, // Support both fields
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
      })),
      site: doc.site,
      createdAt: doc.createdAt?.toISOString(),
      updatedAt: doc.updatedAt?.toISOString(),
    }));

    return NextResponse.json({ conversations: formattedConversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title } = await request.json();
    const { db } = await connectToDatabase();
    
    const now = new Date();
    const conversationId = `konv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const conversation = {
      userId: session.user.id,
      conversationId,
      messages: [],
      createdAt: now,
      updatedAt: now,
      handledBy: 'bot' as const,
      site: title || 'Dashboard Chat'
    };
    
    await db.collection<ConversationDocument>('conversations').insertOne(conversation);

    return NextResponse.json({ 
      conversationId,
      message: 'Conversation created successfully'
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
