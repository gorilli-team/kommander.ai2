import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { ConversationService } from '@/backend/lib/conversationService';
import { getContextInfo } from '@/backend/lib/contextHelpers';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const sortBy = searchParams.get('sortBy') as 'lastActivity' | 'createdAt' || 'lastActivity';
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';
    const search = searchParams.get('search');

    // Get context info to determine if we should filter by organization
    const { context, organizationId } = await getContextInfo();
    
    console.log('[API /conversations] Context:', context, 'OrganizationId:', organizationId, 'UserId:', session.user.id);

    const conversationService = new ConversationService();

    // Use organization ID if in organization context, otherwise use user ID
    const contextId = context === 'organization' && organizationId ? organizationId : session.user.id;

    let conversations;
    if (search) {
      conversations = await conversationService.searchConversations(
        contextId,
        search,
        { limit, skip }
      );
    } else {
      conversations = await conversationService.getUserConversations(
        contextId,
        { limit, skip, includeArchived, sortBy, sortOrder }
      );
    }

    return NextResponse.json({ conversations });
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
    
    const conversationService = new ConversationService();
    const conversationId = await conversationService.createConversation(
      session.user.id,
      title
    );

    return NextResponse.json({ 
      conversationId: conversationId.toString(),
      message: 'Conversation created successfully'
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
