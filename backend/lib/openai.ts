
import OpenAI from "openai";
import { costTracker, calculateApiCost } from './costTracking';
import { getClientInfo } from './clientIdentification';

let openai: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Please define the OPENAI_API_KEY environment variable inside .env.local');
  }

  if (!openai) {
    openai = new OpenAI({ apiKey });
  }

  return openai;
}

interface TrackedChatCompletion {
  userId?: string;
  clientId?: string;
  conversationId?: string;
  endpoint: string;
  userMessage?: string;
  metadata?: {
    personality?: string;
    traits?: string[];
    hasUploadedFiles?: boolean;
    fileTypes?: string[];
  };
}

// Wrapper che traccia automaticamente i costi
export async function createTrackedChatCompletion(
  params: OpenAI.Chat.Completions.ChatCompletionCreateParams,
  trackingInfo: TrackedChatCompletion
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const startTime = Date.now();
  const client = getOpenAI();
  
  try {
    const completion = await client.chat.completions.create(params);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    const usage = completion.usage;
    if (usage) {
      const model = params.model || 'gpt-3.5-turbo';
      const inputTokens = usage.prompt_tokens;
      const outputTokens = usage.completion_tokens;
      const totalTokens = usage.total_tokens;
      
      const { inputCost, outputCost, totalCost } = calculateApiCost(model, inputTokens, outputTokens);
      
      // Ottieni informazioni cliente dettagliate
      const clientInfo = trackingInfo.userId ? await getClientInfo(trackingInfo.userId) : null;
      
      await costTracker.trackApiUsage({
        userId: trackingInfo.userId,
        clientId: trackingInfo.clientId || clientInfo?.userId,
        clientEmail: clientInfo?.clientEmail,
        companyName: clientInfo?.companyName,
        conversationId: trackingInfo.conversationId,
        model,
        inputTokens,
        outputTokens,
        totalTokens,
        inputCost,
        outputCost,
        totalCost,
        responseTime,
        success: true,
        endpoint: trackingInfo.endpoint,
        userMessage: trackingInfo.userMessage,
        assistantResponse: completion.choices[0]?.message?.content,
        metadata: {
          ...trackingInfo.metadata,
          sector: clientInfo?.sector,
          planType: clientInfo?.planType,
          botCount: clientInfo?.botCount
        }
      });
    }
    
    return completion;
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Traccia anche gli errori
    await costTracker.trackApiUsage({
      userId: trackingInfo.userId,
      clientId: trackingInfo.clientId,
      conversationId: trackingInfo.conversationId,
      model: params.model || 'gpt-3.5-turbo',
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      responseTime,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      endpoint: trackingInfo.endpoint,
      userMessage: trackingInfo.userMessage,
      metadata: trackingInfo.metadata
    });
    
    throw error;
  }
}
