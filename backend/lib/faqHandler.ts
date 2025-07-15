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
    // Load FAQs from database
    const faqs = await loadFAQsFromDatabase(userId, organizationId);
    
    if (!faqs || faqs.length === 0) {
      return { isFaqMatch: false, answer: '' };
    }
    
    // Find best match using semantic similarity
    const bestMatch = await findBestFaqMatch(userInput, faqs, FAQ_SIMILARITY_THRESHOLD);
    
    if (bestMatch && bestMatch.similarity >= FAQ_SIMILARITY_THRESHOLD) {
      console.log(`[faqHandler.ts] FAQ match found with similarity ${bestMatch.similarity.toFixed(3)}`);
      return {
        isFaqMatch: true,
        answer: bestMatch.faq.answer, // Return exact answer from DB
        similarity: bestMatch.similarity,
        faqId: bestMatch.faq._id?.toString() || bestMatch.faq.id
      };
    } else {
      console.log(`[faqHandler.ts] No FAQ match found above threshold ${FAQ_SIMILARITY_THRESHOLD}`);
      return { isFaqMatch: false, answer: '' };
    }
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
