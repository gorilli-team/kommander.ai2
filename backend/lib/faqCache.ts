import { connectToDatabase } from '@/backend/lib/mongodb';
import type { Faq } from '@/backend/schemas/faq';

/**
 * FAQ Cache System - mantiene sempre le FAQ più rilevanti senza modificare il codice esistente
 * 
 * Idea: Creiamo una "vista" intelligente delle FAQ che includa sempre quelle nuove
 */

interface FaqCacheEntry {
  userId: string;
  faqs: Faq[];
  lastUpdated: Date;
  lastFaqCount: number;
}

const faqCache = new Map<string, FaqCacheEntry>();

/**
 * Controlla se la cache deve essere aggiornata
 */
async function shouldUpdateCache(userId: string): Promise<boolean> {
  const cached = faqCache.get(userId);
  if (!cached) return true;
  
  // Aggiorna se è passata più di 1 ora
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (cached.lastUpdated < hourAgo) return true;
  
  // Controlla se sono state aggiunte nuove FAQ
  const { db } = await connectToDatabase();
  const currentCount = await db.collection('faqs').countDocuments({ userId });
  if (currentCount !== cached.lastFaqCount) return true;
  
  return false;
}

/**
 * Carica FAQ in modo intelligente con priorità alle recenti
 */
export async function getCachedFaqs(userId: string, limit: number = 10): Promise<Faq[]> {
  const shouldUpdate = await shouldUpdateCache(userId);
  
  if (!shouldUpdate) {
    const cached = faqCache.get(userId);
    if (cached) {
      console.log(`[FaqCache] Using cached FAQs for user ${userId}`);
      return cached.faqs.slice(0, limit);
    }
  }
  
  console.log(`[FaqCache] Refreshing FAQ cache for user ${userId}`);
  
  const { db } = await connectToDatabase();
  
  // Strategia: 30% FAQ recenti + 70% FAQ casuali
  const recentCount = Math.ceil(limit * 0.3);
  const randomCount = limit - recentCount;
  
  // Carica FAQ recenti
  const recentFaqs = await db.collection('faqs')
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(recentCount)
    .toArray();
  
  // Carica FAQ casuali (escluse le recenti)
  const recentIds = recentFaqs.map(f => f._id);
  const randomFaqs = await db.collection('faqs')
    .find({ userId, _id: { $nin: recentIds } })
    .limit(randomCount)
    .toArray();
  
  // Combina
  const allSelectedFaqs = [...recentFaqs, ...randomFaqs];
  
  const formattedFaqs: Faq[] = allSelectedFaqs.map(doc => ({
    id: doc._id.toString(),
    userId: doc.userId,
    question: doc.question,
    answer: doc.answer,
    createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
  }));
  
  // Aggiorna cache
  const totalCount = await db.collection('faqs').countDocuments({ userId });
  faqCache.set(userId, {
    userId,
    faqs: formattedFaqs,
    lastUpdated: new Date(),
    lastFaqCount: totalCount,
  });
  
  console.log(`[FaqCache] Cached ${formattedFaqs.length} FAQs for user ${userId} (${recentCount} recent + ${randomCount} random)`);
  
  return formattedFaqs;
}

/**
 * Forza l'aggiornamento della cache quando vengono create nuove FAQ
 */
export function invalidateFaqCache(userId: string) {
  faqCache.delete(userId);
  console.log(`[FaqCache] Invalidated cache for user ${userId}`);
}

/**
 * Debugging: mostra lo stato della cache
 */
export function getFaqCacheStatus(userId: string) {
  const cached = faqCache.get(userId);
  if (!cached) return { cached: false };
  
  return {
    cached: true,
    lastUpdated: cached.lastUpdated,
    faqCount: cached.faqs.length,
    lastFaqCount: cached.lastFaqCount,
    oldestFaq: cached.faqs[cached.faqs.length - 1]?.question?.substring(0, 50),
    newestFaq: cached.faqs[0]?.question?.substring(0, 50),
  };
}
