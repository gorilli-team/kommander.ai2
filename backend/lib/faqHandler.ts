import { findBestFaqMatch, generateEmbedding } from './embeddings';
import { connectToDatabase } from './mongodb';
import { ObjectId } from 'mongodb';
import type { Faq } from '@/backend/schemas/faq';

const FAQ_SIMILARITY_THRESHOLD = 0.8;

/**
 * Main FAQ query handler that implements the required logic
 * @param userInput - User's question
 * @param userId - Optional user ID for scoped FAQs
 * @param organizationId - Optional organization ID for scoped FAQs
 * @returns Promise<{ isFaqMatch: boolean, answer: string, similarity?: number }>
 */
export async function handleFAQQuery(
  userInput: string,
  userId?: string,
  organizationId?: string
): Promise<{ isFaqMatch: boolean; answer: string; similarity?: number; faqId?: string }> {
  try {
// Build an extended context using FAQs and documents
async function buildExtendedContext(userInput: string, faqs: Faq[], userId?: string, organizationId?: string): Promise<string> {
  let context = `User Query: ${userInput}\n\n`;
  
  // Add FAQs
  if (faqs.length > 0) {
    context += `Available FAQs:\n`;
    faqs.forEach(faq => {
      context += `- Q: ${faq.question}\n  A: ${faq.answer}\n\n`;
    });
  }
  
  // Add documents if available
  try {
    const { db } = await connectToDatabase();
    
    // Build query for documents
    let docQuery: any = {};
    if (userId) {
      docQuery.userId = userId;
    } else if (organizationId) {
      docQuery.organizationId = organizationId;
    }
    
    // Get recent documents
    const documents = await db.collection('raw_files_meta')
      .find(docQuery)
      .project({ fileName: 1, originalFileType: 1, gridFsFileId: 1, uploadedAt: 1 })
      .sort({ uploadedAt: -1 })
      .limit(5) // Limit to 5 most recent documents
      .toArray();
    
    if (documents.length > 0) {
      context += `\nAvailable Documents:\n`;
      documents.forEach(doc => {
        context += `- File: ${doc.fileName} (${doc.originalFileType})\n`;
      });
      context += `\n`;
    }
    
    console.log(`[faqHandler.ts] Context includes ${faqs.length} FAQs and ${documents.length} documents`);
    
  } catch (error) {
    console.error('[faqHandler.ts] Error loading documents for context:', error);
  }
  
  return context;
}

// Fetch data
    const faqs = await loadFAQsFromDatabase(userId, organizationId);
    
    if (!faqs || faqs.length === 0) {
      return { isFaqMatch: false, answer: '' };
    }
    
// Function to get a response from LLM using OpenAI's API
async function getLLMResponse(context: string): Promise<string> {
  try {
    const { createTrackedChatCompletion } = await import('./openai');
    
    console.log(`[faqHandler.ts] Sending context to LLM: ${context.substring(0, 100)}...`);
    
    const messages = [
      {
        role: 'system' as const,
        content: `Tu sei un assistente AI specializzato che deve rispondere basandosi ESCLUSIVAMENTE sulle informazioni fornite. 

ISTRUZIONI IMPORTANTI:
- Usa SOLO le informazioni dalle FAQ e documenti forniti
- Se trovi informazioni rilevanti, rispondi in modo completo e dettagliato
- Includi SEMPRE i link esatti quando presenti nelle FAQ
- Se non trovi informazioni sufficienti, dillo chiaramente
- Mantieni un tono professionale ma amichevole
- Struttura la risposta in modo chiaro e leggibile`
      },
      {
        role: 'user' as const,
        content: context
      }
    ];
    
    const completion = await createTrackedChatCompletion(
      {
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1500,
      },
      {
        userId: 'system',
        endpoint: 'faq-context-response',
        userMessage: context.substring(0, 100),
        metadata: {
          source: 'faq-handler',
          contextLength: context.length
        }
      }
    );
    
    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      return 'Mi dispiace, non sono riuscito a elaborare una risposta in questo momento.';
    }
    
    console.log(`[faqHandler.ts] LLM response generated successfully`);
    return response.trim();
    
  } catch (error: any) {
    console.error(`[faqHandler.ts] Error getting LLM response:`, error);
    return 'Mi dispiace, si è verificato un errore durante l\'elaborazione della tua richiesta.';
  }
}

// Create a detailed context assembly with all FAQ and document data
    const context = await buildExtendedContext(userInput, faqs, userId, organizationId);
    // Log context information
    console.log(`[faqHandler.ts] Context assembled for query: ${userInput}`);
    
    // Pass the context to the LLM and get the response
    const llmResponse = await getLLMResponse(context);

    return {
      isFaqMatch: true,
      answer: llmResponse,
      similarity: 1.0, // Assuming full context gives high relevance
      faqId: undefined
    };
  } catch (error) {
    console.error('[faqHandler.ts] Error in handleFAQQuery:', error);
    return { isFaqMatch: false, answer: '' };
  }
}

/**
 * Loads FAQs from MongoDB with embeddings
 * @param userId - Optional user ID for filtering
 * @param organizationId - Optional organization ID for filtering
 * @returns Promise<Faq[]> - Array of FAQs with embeddings
 */
async function loadFAQsFromDatabase(userId?: string, organizationId?: string): Promise<Faq[]> {
  try {
    const { db } = await connectToDatabase();
    
    // Build query based on context
    let query: any = {};
    if (userId) {
      query.userId = userId;
    } else if (organizationId) {
      query.organizationId = organizationId;
    }
    
    const faqs = await db.collection('faqs').find(query).toArray();
    
    console.log(`[faqHandler.ts] Loaded ${faqs.length} FAQs from database`);
    return faqs as Faq[];
  } catch (error) {
    console.error('[faqHandler.ts] Error loading FAQs from database:', error);
    return [];
  }
}

/**
 * Updates FAQ with generated embedding
 * @param faqId - FAQ ID to update
 * @param question - FAQ question to generate embedding for
 * @returns Promise<boolean> - Success status
 */
export async function updateFAQEmbedding(faqId: string, question: string): Promise<boolean> {
  try {
    const embedding = await generateEmbedding(question);
    
    const { db } = await connectToDatabase();
    const result = await db.collection('faqs').updateOne(
      { _id: new ObjectId(faqId) },
      { $set: { embedding, updatedAt: new Date() } }
    );
    
    return result.modifiedCount > 0;
  } catch (error) {
    console.error(`[faqHandler.ts] Error updating FAQ embedding for ID ${faqId}:`, error);
    return false;
  }
}

/**
 * Batch updates embeddings for all FAQs without embeddings
 * @param userId - Optional user ID for filtering
 * @param organizationId - Optional organization ID for filtering
 * @returns Promise<{ updated: number, failed: number }>
 */
export async function batchUpdateFAQEmbeddings(
  userId?: string,
  organizationId?: string
): Promise<{ updated: number; failed: number }> {
  try {
    const { db } = await connectToDatabase();
    
    // Build query for FAQs without embeddings
    let query: any = {
      $or: [
        { embedding: { $exists: false } },
        { embedding: { $size: 0 } },
        { embedding: null }
      ]
    };
    
    if (userId) {
      query.userId = userId;
    } else if (organizationId) {
      query.organizationId = organizationId;
    }
    
    const faqsWithoutEmbeddings = await db.collection('faqs').find(query).toArray();
    
    console.log(`[faqHandler.ts] Found ${faqsWithoutEmbeddings.length} FAQs without embeddings`);
    
    let updated = 0;
    let failed = 0;
    
    for (const faq of faqsWithoutEmbeddings) {
      try {
        const embedding = await generateEmbedding(faq.question);
        
        await db.collection('faqs').updateOne(
          { _id: faq._id },
          { $set: { embedding, updatedAt: new Date() } }
        );
        
        updated++;
        console.log(`[faqHandler.ts] Updated embedding for FAQ: ${faq.question.substring(0, 50)}...`);
      } catch (error) {
        failed++;
        console.error(`[faqHandler.ts] Failed to update embedding for FAQ ID ${faq._id}:`, error);
      }
    }
    
    console.log(`[faqHandler.ts] Batch update completed: ${updated} updated, ${failed} failed`);
    return { updated, failed };
  } catch (error) {
    console.error('[faqHandler.ts] Error in batchUpdateFAQEmbeddings:', error);
    return { updated: 0, failed: 0 };
  }
}

/**
 * Validates that FAQ has valid embedding
 * @param faq - FAQ object to validate
 * @returns boolean - Whether FAQ has valid embedding
 */
export function hasValidEmbedding(faq: Faq): boolean {
  return faq.embedding && Array.isArray(faq.embedding) && faq.embedding.length > 0;
}
