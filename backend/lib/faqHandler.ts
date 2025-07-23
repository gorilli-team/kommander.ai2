import { findBestFaqMatch, generateEmbedding } from './embeddings';
import { connectToDatabase } from './mongodb';
import { ObjectId } from 'mongodb';
import type { Faq } from '@/backend/schemas/faq';

// Interfaccia per le query enhanced
interface EnhancedQuery {
  original: string;
  normalized: string;
  keywords: string[];
  intent: string;
  variants: string[];
  concepts: string[];
}

const FAQ_SIMILARITY_THRESHOLD = 0.8;

// Cache per le query enhanced
const queryEnhancementCache = new Map<string, { result: EnhancedQuery; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minuti

/**
 * Clears expired cache entries
 */
function clearExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of queryEnhancementCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      queryEnhancementCache.delete(key);
    }
  }
}

/**
 * Gets cached enhanced query or null if not found/expired
 * @param query - Original query
 * @returns EnhancedQuery or null
 */
function getCachedEnhancedQuery(query: string): EnhancedQuery | null {
  const cached = queryEnhancementCache.get(query.toLowerCase().trim());
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.result;
  }
  return null;
}

/**
 * Caches enhanced query result
 * @param query - Original query
 * @param result - Enhanced query result
 */
function cacheEnhancedQuery(query: string, result: EnhancedQuery): void {
  clearExpiredCache();
  queryEnhancementCache.set(query.toLowerCase().trim(), {
    result,
    timestamp: Date.now()
  });
}

/**
 * Enhanced query processing with AI-powered intent recognition
 * @param userInput - Original user query
 * @returns Promise<EnhancedQuery> - Enhanced query with variants and keywords
 */
async function enhanceUserQuery(userInput: string): Promise<EnhancedQuery> {
  try {
    // 🚀 Check cache first
    const cachedResult = getCachedEnhancedQuery(userInput);
    if (cachedResult) {
      console.log(`[faqHandler.ts] Using cached enhancement for: ${userInput}`);
      return cachedResult;
    }
    
    const { createTrackedChatCompletion } = await import('./openai');
    
    console.log(`[faqHandler.ts] Enhancing query: ${userInput}`);
    
    const enhancementPrompt = `Analizza questa domanda dell'utente e migliorala per un sistema FAQ.

Domanda originale: "${userInput}"

Compiti:
1. NORMALIZZA la domanda correggendo errori di spelling e grammatica
2. IDENTIFICA l'intento principale (cosa vuole sapere l'utente)
3. ESTRAI le parole chiave più importanti
4. GENERA 3-5 varianti alternative della stessa domanda
5. IDENTIFICA i concetti principali collegati

Rispondi SOLO in questo formato JSON:
{
  "normalized": "versione corretta e chiara della domanda",
  "intent": "intento principale in una frase",
  "keywords": ["parola1", "parola2", "parola3"],
  "variants": [
    "Come posso fare X?",
    "Qual è il modo per Y?",
    "È possibile Z?"
  ],
  "concepts": ["concetto1", "concetto2", "concetto3"]
}`;
    
    const completion = await createTrackedChatCompletion(
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Sei un esperto di NLP che analizza domande per sistemi FAQ. Rispondi sempre in formato JSON valido.' },
          { role: 'user', content: enhancementPrompt }
        ],
        temperature: 0.3,
        max_tokens: 600,
      },
      {
        userId: 'system',
        endpoint: 'query-enhancement',
        userMessage: userInput,
        metadata: {
          source: 'query-enhancement',
          originalLength: userInput.length
        }
      }
    );
    
    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      // Fallback to basic processing
      return createBasicEnhancedQuery(userInput);
    }
    
    try {
      const parsed = JSON.parse(response);
      
      const enhancedResult = {
        original: userInput,
        normalized: parsed.normalized || userInput,
        keywords: parsed.keywords || extractBasicKeywords(userInput),
        intent: parsed.intent || 'Richiesta generica di informazioni',
        variants: parsed.variants || [userInput],
        concepts: parsed.concepts || []
      };
      
      // 🚀 Cache the result
      cacheEnhancedQuery(userInput, enhancedResult);
      
      return enhancedResult;
    } catch (parseError) {
      console.error('[faqHandler.ts] Error parsing enhancement response:', parseError);
      const fallbackResult = createBasicEnhancedQuery(userInput);
      cacheEnhancedQuery(userInput, fallbackResult);
      return fallbackResult;
    }
    
  } catch (error) {
    console.error('[faqHandler.ts] Error in enhanceUserQuery:', error);
    return createBasicEnhancedQuery(userInput);
  }
}

/**
 * Creates a basic enhanced query as fallback
 * @param userInput - Original user input
 * @returns EnhancedQuery - Basic enhanced query
 */
function createBasicEnhancedQuery(userInput: string): EnhancedQuery {
  return {
    original: userInput,
    normalized: userInput.toLowerCase().trim(),
    keywords: extractBasicKeywords(userInput),
    intent: 'Richiesta di informazioni',
    variants: [userInput],
    concepts: []
  };
}

/**
 * Extracts basic keywords from user input
 * @param text - Input text
 * @returns string[] - Array of keywords
 */
function extractBasicKeywords(text: string): string[] {
  // Remove common Italian stop words and extract meaningful terms
  const stopWords = ['il', 'la', 'di', 'che', 'e', 'a', 'un', 'per', 'una', 'con', 'non', 'da', 'come', 'si', 'su', 'le', 'dei', 'del', 'è', 'sono', 'ho', 'hai', 'ha', 'posso', 'può', 'dove', 'quando', 'perché', 'cosa', 'chi'];
  
  return text
    .toLowerCase()
    .replace(/[^a-zA-ZÀ-ÿ\s]/g, '') // Remove special characters
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word))
    .slice(0, 10); // Limit to 10 keywords
}

/**
 * Basic fuzzy matching for common spelling errors
 * @param input - User input word
 * @param target - Target word to match against
 * @returns number - Similarity score (0-1)
 */
function calculateFuzzyMatch(input: string, target: string): number {
  if (input === target) return 1.0;
  
  // Check for common transformations
  const inputLower = input.toLowerCase();
  const targetLower = target.toLowerCase();
  
  // Exact match
  if (inputLower === targetLower) return 1.0;
  
  // Substring match
  if (inputLower.includes(targetLower) || targetLower.includes(inputLower)) {
    return 0.8;
  }
  
  // Levenshtein distance approximation
  const maxLength = Math.max(input.length, target.length);
  const distance = levenshteinDistance(inputLower, targetLower);
  
  return Math.max(0, 1 - distance / maxLength);
}

/**
 * Simple Levenshtein distance calculation
 * @param a - First string
 * @param b - Second string
 * @returns number - Edit distance
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Corrects common spelling errors using fuzzy matching
 * @param input - User input
 * @param faqQuestions - Array of FAQ questions for reference
 * @returns string - Corrected input
 */
function correctSpelling(input: string, faqQuestions: string[]): string {
  const words = input.split(/\s+/);
  const correctedWords = words.map(word => {
    let bestMatch = word;
    let bestScore = 0;
    
    // Check against FAQ questions for common terms
    for (const faq of faqQuestions) {
      const faqWords = faq.split(/\s+/);
      for (const faqWord of faqWords) {
        const score = calculateFuzzyMatch(word, faqWord);
        if (score > bestScore && score > 0.7) {
          bestMatch = faqWord;
          bestScore = score;
        }
      }
    }
    
    return bestMatch;
  });
  
  return correctedWords.join(' ');
}

/**
 * Main FAQ query handler with REAL FAQ matching using embeddings
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
    console.log(`[handleFAQQuery] 🔍 Starting FAQ matching for: "${userInput}"`);
    
    // Load FAQs from database
    const faqs = await loadFAQsFromDatabase(userId, organizationId);
    
    if (!faqs || faqs.length === 0) {
      console.log(`[handleFAQQuery] ❌ No FAQs found in database`);
      return { isFaqMatch: false, answer: '' };
    }
    
    console.log(`[handleFAQQuery] 📊 Found ${faqs.length} FAQs, checking for matches...`);
    
    // 🔍 STEP 1: Try exact/fuzzy text matching FIRST (faster)
    const textMatch = findBestTextMatch(userInput, faqs);
    if (textMatch && textMatch.similarity >= FAQ_SIMILARITY_THRESHOLD) {
      console.log(`[handleFAQQuery] ✅ EXACT/FUZZY MATCH found! Similarity: ${textMatch.similarity.toFixed(3)}`);
      console.log(`[handleFAQQuery] ✅ Question: "${textMatch.faq.question}"`);
      console.log(`[handleFAQQuery] ✅ Answer: "${textMatch.faq.answer.substring(0, 100)}..."`);
      
      return {
        isFaqMatch: true,
        answer: textMatch.faq.answer,
        similarity: textMatch.similarity,
        faqId: textMatch.faq.id
      };
    }
    
    // 🔍 STEP 2: Try semantic embedding matching (slower but more accurate)
    console.log(`[handleFAQQuery] 🤖 No text match found, trying semantic embeddings...`);
    try {
      const embeddingMatch = await findBestFaqMatch(userInput, faqs);
      
      if (embeddingMatch && embeddingMatch.similarity >= FAQ_SIMILARITY_THRESHOLD) {
        console.log(`[handleFAQQuery] ✅ SEMANTIC MATCH found! Similarity: ${embeddingMatch.similarity.toFixed(3)}`);
        console.log(`[handleFAQQuery] ✅ Question: "${embeddingMatch.faq.question}"`);
        console.log(`[handleFAQQuery] ✅ Answer: "${embeddingMatch.faq.answer.substring(0, 100)}..."`);
        
        return {
          isFaqMatch: true,
          answer: embeddingMatch.faq.answer,
          similarity: embeddingMatch.similarity,
          faqId: embeddingMatch.faq.id
        };
      }
    } catch (embeddingError) {
      console.error(`[handleFAQQuery] ⚠️ Embedding matching failed:`, embeddingError);
      // Continue to fallback - don't break the entire system
    }
    
    // 🔍 STEP 3: Fallback - no direct FAQ match found
    console.log(`[handleFAQQuery] ❌ No direct FAQ matches found (threshold: ${FAQ_SIMILARITY_THRESHOLD})`);
    console.log(`[handleFAQQuery] ❌ Best text similarity: ${textMatch?.similarity?.toFixed(3) || 'N/A'}`);
    
    return {
      isFaqMatch: false,
      answer: '',
      similarity: textMatch?.similarity || 0
    };
    
  } catch (error) {
    console.error('[handleFAQQuery] ❌ Error in FAQ matching:', error);
    return { isFaqMatch: false, answer: '' };
  }
}

/**
 * Fast text-based FAQ matching using fuzzy string comparison
 * @param userInput - User's question
 * @param faqs - Array of FAQs to search
 * @returns Best match or null
 */
function findBestTextMatch(userInput: string, faqs: Faq[]): { faq: Faq; similarity: number } | null {
  let bestMatch: { faq: Faq; similarity: number } | null = null;
  let bestSimilarity = 0;
  
  const userInputLower = userInput.toLowerCase().trim();
  const userWords = userInputLower.split(/\s+/).filter(word => word.length > 2);
  
  console.log(`[findBestTextMatch] 🔍 Checking ${faqs.length} FAQs for text matches...`);
  
  for (const faq of faqs) {
    const questionLower = faq.question.toLowerCase();
    const answerLower = faq.answer.toLowerCase();
    
    // 🔍 Check for exact question match
    if (questionLower === userInputLower) {
      console.log(`[findBestTextMatch] ✅ EXACT match found: "${faq.question}"`);
      return { faq, similarity: 1.0 };
    }
    
    // 🔍 Check for substring matches
    if (questionLower.includes(userInputLower) || userInputLower.includes(questionLower)) {
      const similarity = 0.9;
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = { faq, similarity };
      }
      continue;
    }
    
    // 🔍 Calculate word overlap similarity
    const questionWords = questionLower.split(/\s+/);
    const answerWords = answerLower.split(/\s+/);
    const allFaqWords = [...questionWords, ...answerWords];
    
    let matchingWords = 0;
    let totalUserWords = userWords.length;
    
    if (totalUserWords === 0) continue;
    
    for (const userWord of userWords) {
      for (const faqWord of allFaqWords) {
        if (faqWord.includes(userWord) || userWord.includes(faqWord)) {
          matchingWords++;
          break; // Count each user word only once
        }
      }
    }
    
    const similarity = matchingWords / totalUserWords;
    
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = { faq, similarity };
    }
  }
  
  if (bestMatch) {
    console.log(`[findBestTextMatch] 🏆 Best text match: "${bestMatch.faq.question}" (similarity: ${bestMatch.similarity.toFixed(3)})`);
  } else {
    console.log(`[findBestTextMatch] ❌ No good text matches found`);
  }
  
  return bestMatch;
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
