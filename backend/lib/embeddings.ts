import { getOpenAI } from './openai';

/**
 * Generates embedding vector for a given text using OpenAI
 * @param text - Text to generate embedding for
 * @returns Promise<number[]> - Array of floats representing the embedding
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const openai = getOpenAI();
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small', // More cost-effective than text-embedding-3-large
      input: text,
      encoding_format: 'float',
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('[embeddings.ts] Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Calculates cosine similarity between two vectors
 * @param a - First vector
 * @param b - Second vector
 * @returns number - Cosine similarity score between 0 and 1
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (normA * normB);
}

/**
 * FAQ matching interface
 */
export interface FaqMatch {
  faq: any;
  similarity: number;
}

/**
 * Finds the best FAQ match using semantic similarity
 * @param userInput - User's question
 * @param faqs - Array of FAQs with embeddings
 * @param threshold - Similarity threshold (default: 0.8)
 * @returns Promise<FaqMatch | null> - Best match or null if no match above threshold
 */
export async function findBestFaqMatch(
  userInput: string,
  faqs: any[],
  threshold: number = 0.8
): Promise<FaqMatch | null> {
  if (!faqs || faqs.length === 0) {
    return null;
  }
  
  try {
    // Generate embedding for user input
    const userEmbedding = await generateEmbedding(userInput);
    
    // Calculate similarities
    const matches: FaqMatch[] = faqs
      .filter(faq => faq.embedding && Array.isArray(faq.embedding))
      .map(faq => ({
        faq,
        similarity: cosineSimilarity(userEmbedding, faq.embedding)
      }))
      .sort((a, b) => b.similarity - a.similarity);
    
    // Return best match if above threshold
    const bestMatch = matches[0];
    if (bestMatch && bestMatch.similarity >= threshold) {
      return bestMatch;
    }
    
    return null;
  } catch (error) {
    console.error('[embeddings.ts] Error in findBestFaqMatch:', error);
    return null;
  }
}

/**
 * Generates and updates embeddings for FAQ questions
 * @param faqQuestions - Array of FAQ questions
 * @returns Promise<number[][]> - Array of embeddings
 */
export async function generateFaqEmbeddings(faqQuestions: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  
  for (const question of faqQuestions) {
    try {
      const embedding = await generateEmbedding(question);
      embeddings.push(embedding);
    } catch (error) {
      console.error(`[embeddings.ts] Error generating embedding for question: "${question}"`, error);
      // Push empty array as fallback
      embeddings.push([]);
    }
  }
  
  return embeddings;
}
