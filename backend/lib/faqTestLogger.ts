import { connectToDatabase } from '@/backend/lib/mongodb';
import type { Faq } from '@/backend/schemas/faq';

/**
 * Sistema di Test A/B per FAQ - logga entrambi i risultati senza modificare il comportamento
 * 
 * Questo sistema:
 * 1. Mantiene il comportamento originale (FAQ casuali)
 * 2. Calcola in background il risultato del semantic search
 * 3. Logga la comparazione per analisi offline
 * 4. ZERO rischi - non modifica nessuna risposta
 */

// Cache per evitare di ricalcolare sempre
const faqCache = new Map<string, { faqs: any[], timestamp: number }>();

function calculateSimpleSimilarity(text1: string, text2: string): number {
  const normalize = (text: string) => 
    text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  
  const words1 = new Set(normalize(text1));
  const words2 = new Set(normalize(text2));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

async function getAllUserFaqs(userId: string): Promise<any[]> {
  const cacheKey = `faqs_${userId}`;
  const cached = faqCache.get(cacheKey);
  
  // Cache per 5 minuti
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return cached.faqs;
  }
  
  const { db } = await connectToDatabase();
  const allFaqs = await db.collection('faqs').find({ userId }).toArray();
  
  faqCache.set(cacheKey, { faqs: allFaqs, timestamp: Date.now() });
  return allFaqs;
}

/**
 * Test non-invasivo: mantiene il comportamento originale ma logga alternative
 */
export async function testFaqMethods(
  userId: string, 
  userMessage: string, 
  originalFaqs: Faq[]
): Promise<void> {
  try {
    // 1. Ottieni tutte le FAQ dell'utente
    const allFaqs = await getAllUserFaqs(userId);
    
    if (allFaqs.length <= 10) {
      // Se ha poche FAQ, semantic search non cambia nulla
      console.log(`[FaqTest] User ${userId} has only ${allFaqs.length} FAQs - semantic search not needed`);
      return;
    }
    
    // 2. Simula semantic search
    const scoredFaqs = allFaqs.map(faq => {
      const questionSim = calculateSimpleSimilarity(userMessage, faq.question);
      const answerSim = calculateSimpleSimilarity(userMessage, faq.answer) * 0.3;
      
      // Bonus recenza
      const ageHours = faq.createdAt ? (Date.now() - new Date(faq.createdAt).getTime()) / (1000 * 60 * 60) : 1000;
      const recencyBonus = Math.max(0, 1 - ageHours / (24 * 7)) * 0.1; // 1 settimana
      
      return {
        ...faq,
        relevanceScore: questionSim + answerSim + recencyBonus
      };
    });
    
    scoredFaqs.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const semanticTop10 = scoredFaqs.slice(0, 10);
    
    // 3. Analisi comparativa
    const originalIds = new Set(originalFaqs.map(f => f.id));
    const semanticIds = new Set(semanticTop10.map(f => f._id.toString()));
    
    const overlap = [...originalIds].filter(id => semanticIds.has(id)).length;
    const overlapPercentage = (overlap / 10) * 100;
    
    // 4. Trova FAQ potenzialmente migliori
    const betterMatches = semanticTop10
      .filter(faq => !originalIds.has(faq._id.toString()) && faq.relevanceScore > 0.2)
      .slice(0, 3);
    
    // 5. Trova FAQ recenti escluse
    const recentFaqs = allFaqs
      .filter(faq => {
        const ageHours = faq.createdAt ? (Date.now() - new Date(faq.createdAt).getTime()) / (1000 * 60 * 60) : 1000;
        return ageHours < 24;
      })
      .filter(faq => !originalIds.has(faq._id.toString()));
    
    // 6. Log dettagliato per analisi
    console.log('\n' + '='.repeat(80));
    console.log(`[FaqTest] A/B Test Results for: "${userMessage.substring(0, 50)}..."`);
    console.log(`[FaqTest] User: ${userId}`);
    console.log(`[FaqTest] Total FAQs: ${allFaqs.length}`);
    console.log(`[FaqTest] Overlap: ${overlap}/10 (${overlapPercentage.toFixed(1)}%)`);
    
    if (betterMatches.length > 0) {
      console.log('\n[FaqTest] 🔍 POTENTIALLY BETTER MATCHES (excluded by random method):');
      betterMatches.forEach((faq, i) => {
        console.log(`  ${i + 1}. "${faq.question.substring(0, 60)}..." (score: ${faq.relevanceScore.toFixed(3)})`);
      });
    }
    
    if (recentFaqs.length > 0) {
      console.log('\n[FaqTest] 🆕 RECENT FAQs EXCLUDED:');
      recentFaqs.forEach((faq, i) => {
        const ageHours = Math.round((Date.now() - new Date(faq.createdAt).getTime()) / (1000 * 60 * 60));
        console.log(`  ${i + 1}. "${faq.question.substring(0, 60)}..." (${ageHours}h old)`);
      });
    }
    
    if (overlapPercentage < 50) {
      console.log('\n[FaqTest] ⚠️  LOW OVERLAP - Semantic search would provide significantly different results');
    } else if (overlapPercentage > 80) {
      console.log('\n[FaqTest] ✅ HIGH OVERLAP - Current method already provides good results');
    }
    
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('[FaqTest] Error during A/B test:', error);
  }
}

/**
 * Versione semplificata per logging veloce
 */
export function logFaqSelection(userId: string, userMessage: string, selectedFaqs: Faq[]): void {
  console.log(`[FaqSelection] User ${userId} asked: "${userMessage.substring(0, 50)}..."`);
  console.log(`[FaqSelection] Using ${selectedFaqs.length} FAQs:`);
  selectedFaqs.slice(0, 3).forEach((faq, i) => {
    console.log(`  ${i + 1}. "${faq.question.substring(0, 50)}..."`);
  });
}

/**
 * Wrapper safe che mantiene il comportamento originale
 */
export async function getFaqsWithLogging(
  userId: string,
  userMessage: string,
  limit: number = 10
): Promise<Faq[]> {
  const { db } = await connectToDatabase();
  
  // COMPORTAMENTO ORIGINALE (IDENTICO)
  const faqsCursor = await db.collection('faqs').find({ userId }).limit(limit).toArray();
  const originalFaqs: Faq[] = faqsCursor.map(doc => ({
    id: doc._id.toString(),
    userId: doc.userId,
    question: doc.question,
    answer: doc.answer,
    createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
  }));
  
  // TEST A/B IN BACKGROUND (NON MODIFICA NULLA)
  setImmediate(() => {
    testFaqMethods(userId, userMessage, originalFaqs).catch(console.error);
  });
  
  // RITORNA ESATTO RISULTATO ORIGINALE
  return originalFaqs;
}
