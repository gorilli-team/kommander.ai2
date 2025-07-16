
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
export async function createStreamingChatCompletion(
  params: OpenAI.Chat.Completions.ChatCompletionCreateParams,
  trackingInfo: TrackedChatCompletion,
  onChunk: (chunk: string) => void
): Promise<OpenAI.Chat.Completions.ChatCompletion | null> {
  const startTime = Date.now();
  const client = getOpenAI();
  
  try {
    const stream = await client.chat.completions.create({
      ...params,
      stream: true
    });
    
    let fullResponse = '';
    let completion: OpenAI.Chat.Completions.ChatCompletion | null = null;
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        onChunk(content);
      }
      
      // Simula una completion per il tracking
      if (chunk.choices[0]?.finish_reason) {
        completion = {
          id: chunk.id,
          object: 'chat.completion',
          created: chunk.created,
          model: chunk.model,
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: fullResponse
            },
            finish_reason: chunk.choices[0].finish_reason
          }],
          usage: {
            prompt_tokens: 0, // Questi saranno stimati
            completion_tokens: 0,
            total_tokens: 0
          }
        };
      }
    }
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Stima approssimativa dei token (1 token ≈ 4 caratteri)
    const estimatedOutputTokens = Math.ceil(fullResponse.length / 4);
    const estimatedInputTokens = Math.ceil(JSON.stringify(params.messages).length / 4);
    const estimatedTotalTokens = estimatedInputTokens + estimatedOutputTokens;
    
    const model = params.model || 'gpt-3.5-turbo';
    const { inputCost, outputCost, totalCost } = calculateApiCost(model, estimatedInputTokens, estimatedOutputTokens);
    
    // Ottieni informazioni cliente dettagliate
    const clientInfo = trackingInfo.userId ? await getClientInfo(trackingInfo.userId) : null;
    
    await costTracker.trackApiUsage({
      userId: trackingInfo.userId,
      clientId: trackingInfo.clientId || clientInfo?.userId,
      clientEmail: clientInfo?.clientEmail,
      companyName: clientInfo?.companyName,
      conversationId: trackingInfo.conversationId,
      model,
      inputTokens: estimatedInputTokens,
      outputTokens: estimatedOutputTokens,
      totalTokens: estimatedTotalTokens,
      inputCost,
      outputCost,
      totalCost,
      responseTime,
      success: true,
      endpoint: trackingInfo.endpoint,
      userMessage: trackingInfo.userMessage,
      assistantResponse: fullResponse,
      metadata: {
        ...trackingInfo.metadata,
        sector: clientInfo?.sector,
        planType: clientInfo?.planType,
        botCount: clientInfo?.botCount,
        isStreaming: true
      }
    });
    
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
      metadata: {
        ...trackingInfo.metadata,
        isStreaming: true
      }
    });
    
    throw error;
  }
}

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

/**
 * Crea embedding per il testo usando OpenAI
 */
export async function createEmbedding(
  text: string,
  model: string = 'text-embedding-3-small'
): Promise<number[]> {
  const startTime = Date.now();
  const client = getOpenAI();
  
  try {
    const response = await client.embeddings.create({
      model,
      input: text.substring(0, 8000), // Limita la lunghezza
      encoding_format: 'float'
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Traccia l'uso dell'embedding
    const usage = response.usage;
    if (usage) {
      const { inputCost } = calculateApiCost(model, usage.total_tokens, 0);
      
      await costTracker.trackApiUsage({
        model,
        inputTokens: usage.total_tokens,
        outputTokens: 0,
        totalTokens: usage.total_tokens,
        inputCost,
        outputCost: 0,
        totalCost: inputCost,
        responseTime,
        success: true,
        endpoint: 'embeddings',
        userMessage: text.substring(0, 100),
        metadata: {
          textLength: text.length,
          embeddingDimension: response.data[0].embedding.length
        }
      });
    }
    
    return response.data[0].embedding;
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Traccia gli errori
    await costTracker.trackApiUsage({
      model,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      responseTime,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      endpoint: 'embeddings',
      userMessage: text.substring(0, 100),
      metadata: {
        textLength: text.length
      }
    });
    
    throw error;
  }
}
