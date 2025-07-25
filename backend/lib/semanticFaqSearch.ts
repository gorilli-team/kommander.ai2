import { connectToDatabase } from '@/backend/lib/mongodb';
import type { Faq } from '@/backend/schemas/faq';

/**
 * Sistema di Ricerca Semantica per FAQ - Versione Full
 */

const faqCache = new Map<string, { faqs: any[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minuti

function calculateAdvancedSimilarity(text1: string, text2: string): number {
  const normalize = (text: string) => 
    text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(word => word.length > 2);
  
  const words1 = new Set(normalize(text1));
  const words2 = new Set(normalize(text2));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  const jaccardSim = intersection.size / union.size;
  
  const importantWords = ['come', 'cosa', 'quando', 'dove', 'prezzo', 'costo', 'integrazione'];
  let keywordBonus = 0;
  for (const word of importantWords) {
    if (words1.has(word) && words2.has(word)) {
      keywordBonus += 0.1;
    }
  }
  
  return Math.min(1, jaccardSim + keywordBonus);
}

async function getAllUserFaqs(userId: string): Promise<any[]> {
  const cacheKey = `faqs_${userId}`;
  const cached = faqCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.faqs;
  }
  
  try {
    const { db } = await connectToDatabase();
    const allFaqs = await db.collection('faqs')
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
    
    faqCache.set(cacheKey, { faqs: allFaqs, timestamp: Date.now() });
    return allFaqs;
  } catch (error) {
    console.error('[SemanticFaqSearch] Error fetching FAQs:', error);
    return [];
  }
}

function calculateRelevanceScore(userMessage: string, faq: any): number {
  const questionSim = calculateAdvancedSimilarity(userMessage, faq.question) * 0.7;
  const answerSim = calculateAdvancedSimilarity(userMessage, faq.answer) * 0.2;
  
  let recencyBonus = 0;
  if (faq.createdAt) {
    const ageHours = (Date.now() - new Date(faq.createdAt).getTime()) / (1000 * 60 * 60);
    
    if (ageHours < 24) {
      recencyBonus = 0.15 * (1 - ageHours / 24);
    } else if (ageHours < 7 * 24) {
      recencyBonus = 0.05 * (1 - ageHours / (7 * 24));
    }
  }
  
  const totalScore = questionSim + answerSim + recencyBonus;
  return Math.min(1, totalScore);
}

function convertToFaqFormat(docs: any[]): Faq[] {
  return docs.map(doc => ({
    id: doc._id.toString(),
    userId: doc.userId,
    question: doc.question,
    answer: doc.answer,
    createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
  }));
}

async function getFallbackFaqs(userId: string, limit: number): Promise<Faq[]> {
  try {
    console.log(`[SemanticFaqSearch] Using fallback method for user ${userId}`);
    
    const { db } = await connectToDatabase();
    const faqsCursor = await db.collection('faqs').find({ userId }).limit(limit).toArray();
    
    return convertToFaqFormat(faqsCursor);
  } catch (error) {
    console.error('[SemanticFaqSearch] Fallback also failed:', error);
    return [];
  }
}

export async function getSemanticFaqs(
  userId: string,
  userMessage: string,
  limit: number = 10
): Promise<Faq[]> {
  const startTime = Date.now();
  
  try {
    const allFaqs = await getAllUserFaqs(userId);
    
    console.log(`[SemanticFaqSearch] User ${userId} has ${allFaqs.length} total FAQs`);
    
    if (allFaqs.length <= limit) {
      console.log(`[SemanticFaqSearch] Using all ${allFaqs.length} FAQs (less than limit)`);
      return convertToFaqFormat(allFaqs);
    }
    
    const scoredFaqs = allFaqs.map(faq => ({
      ...faq,
      relevanceScore: calculateRelevanceScore(userMessage, faq)
    }));
    
    scoredFaqs.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    const selectedFaqs: any[] = [];
    
    const recentFaqs = scoredFaqs.filter(faq => {
      if (!faq.createdAt) return false;
      const ageHours = (Date.now() - new Date(faq.createdAt).getTime()) / (1000 * 60 * 60);
      return ageHours < 24;
    });
    
    const recentToInclude = recentFaqs.slice(0, Math.min(3, Math.floor(limit * 0.3)));
    selectedFaqs.push(...recentToInclude);
    
    const remainingFaqs = scoredFaqs.filter(faq => 
      !selectedFaqs.some(selected => selected._id.toString() === faq._id.toString())
    );
    
    const additionalNeeded = limit - selectedFaqs.length;
    selectedFaqs.push(...remainingFaqs.slice(0, additionalNeeded));
    
    const avgScore = selectedFaqs.reduce((sum, faq) => sum + faq.relevanceScore, 0) / selectedFaqs.length;
    const highRelevanceCount = selectedFaqs.filter(faq => faq.relevanceScore > 0.3).length;
    
    console.log(`[SemanticFaqSearch] Selected ${selectedFaqs.length} FAQs:`);
    console.log(`[SemanticFaqSearch] - Average relevance: ${avgScore.toFixed(3)}`);
    console.log(`[SemanticFaqSearch] - High relevance (>0.3): ${highRelevanceCount}/${selectedFaqs.length}`);
    console.log(`[SemanticFaqSearch] - Recent FAQs included: ${recentToInclude.length}`);
    console.log(`[SemanticFaqSearch] - Processing time: ${Date.now() - startTime}ms`);
    
    selectedFaqs.slice(0, 3).forEach((faq, i) => {
      console.log(`[SemanticFaqSearch] ${i + 1}. "${faq.question.substring(0, 50)}..." (score: ${faq.relevanceScore.toFixed(3)})`);
    });
    
    return convertToFaqFormat(selectedFaqs);
    
  } catch (error) {
    console.error('[SemanticFaqSearch] Error in semantic search, falling back to random:', error);
    return await getFallbackFaqs(userId, limit);
  }
}

export function invalidateFaqCache(userId: string): void {
  const cacheKey = `faqs_${userId}`;
  faqCache.delete(cacheKey);
  console.log(`[SemanticFaqSearch] Cache invalidated for user ${userId}`);
}
