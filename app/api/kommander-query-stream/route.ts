import { NextResponse, NextRequest } from 'next/server';
import { generateStreamingChatResponse } from '@/app/chatbot/actions';
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
    const { userId, message, history, conversationId, site, endUserId } = withInputSanitization(rawBody);
    
    console.log('[kommander-query-stream] Request data:', { userId, conversationId, endUserId, site });
    
    // Input validation
    if (!userId || !message) {
      await withAuditLog(request, 'chat_request', 'kommander-query-stream', userId, false, 'Missing required fields');
      return NextResponse.json(
        { error: 'Missing userId or message.' },
        { status: 400, headers: { ...corsHeaders, ...rateLimitResult.headers } }
      );
    }
    
    // Check for sensitive information
    if (securityService.containsSensitiveInfo(message)) {
      await withAuditLog(request, 'chat_request', 'kommander-query-stream', userId, false, 'Sensitive information detected');
      return NextResponse.json(
        { error: 'Message contains sensitive information. Please remove any personal data.' },
        { status: 400, headers: { ...corsHeaders, ...rateLimitResult.headers } }
      );
    }

    const chatHistory: ChatMessage[] = Array.isArray(history) ? history : [];
    const convId = conversationId || new ObjectId().toString();
    const existing = conversationId ? await getConversation(userId, convId) : null;
    const handledBy = existing?.handledBy || 'bot';
    
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

    // Create a ReadableStream for streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = '';
          
          // Generate streaming response
          const streamResult = await generateStreamingChatResponse(
            message,
            chatHistory,
            userId,
            convId,
            (chunk: string) => {
              // Send each chunk as Server-Sent Event
              const data = JSON.stringify({ 
                type: 'chunk', 
                content: chunk,
                conversationId: convId 
              });
              controller.enqueue(`data: ${data}\n\n`);
              fullResponse += chunk;
            }
          );

          if (streamResult.error) {
            const errorData = JSON.stringify({ 
              type: 'error', 
              error: streamResult.error 
            });
            controller.enqueue(`data: ${errorData}\n\n`);
            controller.close();
            return;
          }

          // Send completion signal
          const completeData = JSON.stringify({ 
            type: 'complete', 
            conversationId: convId,
            handledBy: handledBy,
            sources: streamResult.sources
          });
          controller.enqueue(`data: ${completeData}\n\n`);
          
          // Save messages to conversation
          await appendMessages(
            userId,
            convId,
            [
              { role: 'user', text: message, timestamp: new Date().toISOString() },
              { role: 'assistant', text: fullResponse, timestamp: new Date().toISOString() },
            ],
            site,
            endUserId
          );

          // Log successful chat request
          await withAuditLog(request, 'chat_request', 'kommander-query-stream', userId, true, undefined, {
            conversationId: convId,
            messageLength: message.length,
            responseLength: fullResponse.length
          });

          controller.close();
        } catch (error: any) {
          const errorData = JSON.stringify({ 
            type: 'error', 
            error: error.message || 'Server error.' 
          });
          controller.enqueue(`data: ${errorData}\n\n`);
          controller.close();
        }
      },
    });

    // Return streaming response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...corsHeaders,
        ...rateLimitResult.headers,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Server error.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
