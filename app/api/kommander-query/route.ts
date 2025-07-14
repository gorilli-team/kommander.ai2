import { NextResponse, NextRequest } from 'next/server';
import { generateChatResponse, generateStreamingChatResponse } from '@/app/chatbot/actions';
import type { ChatMessage } from '@/backend/lib/buildPromptServer';
import { appendMessages, getConversation } from '@/app/conversations/actions';
import { ObjectId } from 'mongodb';
import { analyticsService } from '@/backend/lib/analytics';
import { withRateLimit, withInputSanitization, withAuditLog, securityService } from '@/backend/lib/security';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResult = await withRateLimit(request, {
      windowMs: 60000, // 1 minute
      maxRequests: 30 // 30 requests per minute per IP
    });
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { 
          status: 429, 
          headers: { 
            ...corsHeaders,
            ...rateLimitResult.headers
          }
        }
      );
    }
    
    const rawBody = await request.json();
    const { userId, message, history, conversationId, site, endUserId, organizationId } = withInputSanitization(rawBody);
    
    console.log('[kommander-query] Request data:', { userId, conversationId, endUserId, site, organizationId });
    
    // Input validation
    if (!userId || !message) {
      await withAuditLog(request, 'chat_request', 'kommander-query', userId, false, 'Missing required fields');
      return NextResponse.json(
        { error: 'Missing userId or message.' },
        { status: 400, headers: { ...corsHeaders, ...rateLimitResult.headers } }
      );
    }
    
    // Check for sensitive information
    if (securityService.containsSensitiveInfo(message)) {
      await withAuditLog(request, 'chat_request', 'kommander-query', userId, false, 'Sensitive information detected');
      return NextResponse.json(
        { error: 'Message contains sensitive information. Please remove any personal data.' },
        { status: 400, headers: { ...corsHeaders, ...rateLimitResult.headers } }
      );
    }


    const convId = conversationId || new ObjectId().toString();
    const existing = conversationId ? await getConversation(userId, convId) : null;
    const handledBy = existing?.handledBy || 'bot';
    
    // **MEMORIA CONVERSAZIONE**: Carica la storia esistente dal database
    let chatHistory: ChatMessage[] = [];
    if (existing && existing.messages.length > 0) {
      // Converte i messaggi dal formato database al formato richiesto da generateChatResponse
      const allMessages = existing.messages
        .filter(msg => msg.role !== 'system') // Esclude messaggi di sistema
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.text || msg.content || ''
        }));
      
      // Limita la storia agli ultimi 10 messaggi per evitare superamento token limit
      chatHistory = allMessages.slice(-10);
      
      console.log(`[kommander-query] Caricata storia conversazione con ${chatHistory.length} messaggi (da ${allMessages.length} totali)`);
    } else {
      // Fallback alla storia fornita nella richiesta (per compatibilità)
      chatHistory = Array.isArray(history) ? history.slice(-10) : [];
      console.log(`[kommander-query] Utilizzando storia dalla richiesta con ${chatHistory.length} messaggi`);
    }
    
    // Track new conversation if this is the first message
    if (!existing && chatHistory.length === 0) {
      const userAgent = request.headers.get('user-agent') || undefined;
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const ipAddress = forwarded || realIp || undefined;
      
      await analyticsService.trackConversationStarted(userId, convId, userAgent, ipAddress);
    }

    // Check if user is requesting human operator
    const isHumanRequest = message.toLowerCase().includes('operatore umano');
    
    if (handledBy === 'agent') {
      await appendMessages(
        userId,
        convId,
        [{ role: 'user', text: message, timestamp: new Date().toISOString() }],
        site,
        endUserId
      );
      return NextResponse.json({ conversationId: convId, handledBy }, { headers: corsHeaders });
    }
    
    // If user requests human operator, add system message to conversation
    if (isHumanRequest) {
      await appendMessages(
        userId,
        convId,
        [
          { role: 'user', text: message, timestamp: new Date().toISOString() },
          { role: 'system', text: '🔄 L\'utente ha richiesto l\'intervento di un operatore umano', timestamp: new Date().toISOString() }
        ],
        site,
        endUserId
      );
      return NextResponse.json({ 
        reply: 'Certamente! Ti metto subito in contatto con uno specialista. Nel frattempo, se vuoi, puoi continuare a farmi domande: potrei già aiutarti a trovare una soluzione mentre attendi la risposta di un operatore.',
        conversationId: convId, 
        handledBy 
      }, { headers: corsHeaders });
    }

    // Determine context based on organizationId
    const context = organizationId ? {
      type: 'organization' as const,
      organizationId: organizationId
    } : {
      type: 'personal' as const
    };
    
    const result = await generateChatResponse(message, chatHistory, userId, convId, context);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400, headers: corsHeaders }
      );
    }

    // Salva i messaggi nella conversazione
    await appendMessages(
      userId,
      convId,
      [
        { role: 'user', text: message, timestamp: new Date().toISOString() },
        { role: 'assistant', text: result.response as string, timestamp: new Date().toISOString() },
      ],
      site,
      endUserId
    );

    // Log successful chat request
    await withAuditLog(request, 'chat_request', 'kommander-query', userId, true, undefined, {
      conversationId: convId,
      messageLength: message.length,
      responseLength: result.response?.length || 0
    });

    return NextResponse.json(
      { reply: result.response, conversationId: convId, handledBy },
      { headers: { ...corsHeaders, ...rateLimitResult.headers } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Server error.' },
      { status: 500, headers: corsHeaders }
    );
  }
}