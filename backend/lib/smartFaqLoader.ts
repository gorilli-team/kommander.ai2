import { connectToDatabase } from '@/backend/lib/mongodb';
import type { Faq } from '@/backend/schemas/faq';

/**
 * Smart FAQ Loader - carica FAQ intelligentemente senza modificare la logica esistente
 * 
 * Strategia: Carica sempre le ultime 3 FAQ create + 7 FAQ casuali dalle rimanenti
 * Questo garantisce che le nuove FAQ siano sempre incluse mantenendo la diversità
 */

export async function loadSmartFaqs(userId: string, limit: number = 10): Promise<Faq[]> {
  const { db } = await connectToDatabase();
  
  // Determina quante FAQ recenti includere (max 3, o limit/3)
  const recentCount = Math.min(3, Math.floor(limit / 3));
  const remainingCount = limit - recentCount;
  
  // 1. Carica le FAQ più recenti (sempre incluse)
  const recentFaqs = await db.collection('faqs')
    .find({ userId: userId })
    .sort({ createdAt: -1 })
    .limit(recentCount)
    .toArray();
    
  // 2. Carica FAQ casuali dalle rimanenti (escluse quelle già prese)
  const recentIds = recentFaqs.map(faq => faq._id);
  const randomFaqs = await db.collection('faqs')
    .find({ 
      userId: userId,
      _id: { $nin: recentIds }
    })
    .limit(remainingCount)
    .toArray();
  
  // 3. Combina e mappa al formato richiesto
  const allFaqs = [...recentFaqs, ...randomFaqs];
  
  return allFaqs.map(doc => ({
    id: doc._id.toString(),
    userId: doc.userId,
    question: doc.question,
    answer: doc.answer,
    createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
  }));
}

/**
 * Fallback: se non vogliamo cambiare nulla, almeno aggiungiamo logging
 */
export async function logFaqUsage(userId: string, faqs: Faq[], userQuestion: string) {
  console.log(`[SmartFaqLoader] User ${userId} asked: "${userQuestion}"`);
  console.log(`[SmartFaqLoader] Available FAQs: ${faqs.map(f => `"${f.question.substring(0, 50)}..."`).join(', ')}`);
  
  // Controlla se ci sono FAQ molto recenti non incluse
  const { db } = await connectToDatabase();
  const latestFaq = await db.collection('faqs')
    .findOne({ userId }, { sort: { createdAt: -1 } });
    
  if (latestFaq) {
    const isIncluded = faqs.some(f => f.id === latestFaq._id.toString());
    if (!isIncluded) {
      console.warn(`[SmartFaqLoader] ⚠️ Latest FAQ "${latestFaq.question}" not included in response!`);
    }
  }
}
