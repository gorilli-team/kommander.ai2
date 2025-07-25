import { connectToDatabase } from '@/backend/lib/mongodb';
import type { Faq } from '@/backend/schemas/faq';

/**
 * Enhanced FAQ Loader - Wrapper non-invasivo che migliora il caricamento delle FAQ
 * 
 * Questo modulo può essere importato e usato per sostituire le query esistenti
 * con una singola line di codice, garantendo che le nuove FAQ siano sempre incluse.
 * 
 * USO:
 * Prima:  const faqs = await db.collection('faqs').find({ userId }).limit(10).toArray();
 * Dopo:   const faqs = await loadEnhancedFaqs(userId, 10);
 */

export interface EnhancedFaqOptions {
  /** Percentuale di FAQ recenti da includere sempre (default: 30%) */
  recentPercentage?: number;
  /** Forza l'inclusione delle FAQ create nelle ultime N ore (default: 24) */
  mustIncludeHours?: number;
  /** Abilita logging dettagliato */
  debug?: boolean;
}

/**
 * Carica FAQ con garanzia che quelle recenti siano incluse
 */
export async function loadEnhancedFaqs(
  userId: string, 
  limit: number = 10,
  options: EnhancedFaqOptions = {}
): Promise<Faq[]> {
  const {
    recentPercentage = 0.3,
    mustIncludeHours = 24,
    debug = false
  } = options;
  
  const { db } = await connectToDatabase();
  
  if (debug) {
    console.log(`[EnhancedFaqLoader] Loading FAQs for user ${userId}, limit: ${limit}`);
  }
  
  // 1. Controlla se ci sono FAQ molto recenti che DEVONO essere incluse
  const cutoffTime = new Date(Date.now() - mustIncludeHours * 60 * 60 * 1000);
  const mustIncludeFaqs = await db.collection('faqs')
    .find({ 
      userId,
      createdAt: { $gte: cutoffTime }
    })
    .sort({ createdAt: -1 })
    .toArray();
  
  if (debug && mustIncludeFaqs.length > 0) {
    console.log(`[EnhancedFaqLoader] Found ${mustIncludeFaqs.length} recent FAQs (< ${mustIncludeHours}h old)`);
  }
  
  // 2. Se abbiamo FAQ recenti obbligatorie, riduci il limite per le altre
  const remainingLimit = Math.max(0, limit - mustIncludeFaqs.length);
  const recentCount = Math.ceil(remainingLimit * recentPercentage);
  const randomCount = remainingLimit - recentCount;
  
  if (debug) {
    console.log(`[EnhancedFaqLoader] Strategy: ${mustIncludeFaqs.length} mandatory + ${recentCount} recent + ${randomCount} random`);
  }
  
  // 3. Carica FAQ recenti aggiuntive (escluse quelle obbligatorie)
  const mustIncludeIds = mustIncludeFaqs.map(f => f._id);
  const additionalRecentFaqs = recentCount > 0 ? await db.collection('faqs')
    .find({ 
      userId,
      _id: { $nin: mustIncludeIds }
    })
    .sort({ createdAt: -1 })
    .limit(recentCount)
    .toArray() : [];
  
  // 4. Carica FAQ casuali dalle rimanenti
  const excludeIds = [...mustIncludeIds, ...additionalRecentFaqs.map(f => f._id)];
  const randomFaqs = randomCount > 0 ? await db.collection('faqs')
    .find({ 
      userId,
      _id: { $nin: excludeIds }
    })
    .limit(randomCount)
    .toArray() : [];
  
  // 5. Combina tutto
  const allFaqs = [
    ...mustIncludeFaqs,
    ...additionalRecentFaqs,
    ...randomFaqs
  ];
  
  // 6. Formatta nel tipo richiesto
  const result: Faq[] = allFaqs.map(doc => ({
    id: doc._id.toString(),
    userId: doc.userId,
    question: doc.question,
    answer: doc.answer,
    createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
  }));
  
  if (debug) {
    console.log(`[EnhancedFaqLoader] Loaded ${result.length} FAQs:`);
    result.forEach((faq, i) => {
      const age = faq.createdAt ? Math.round((Date.now() - faq.createdAt.getTime()) / (1000 * 60 * 60)) : '?';
      console.log(`  ${i + 1}. "${faq.question.substring(0, 50)}..." (${age}h old)`);
    });
  }
  
  return result;
}

/**
 * Backward compatibility: se vuoi solo sostituire velocemente la query esistente
 */
export async function loadFaqsCompatible(userId: string, limit: number = 10): Promise<any[]> {
  const faqs = await loadEnhancedFaqs(userId, limit, { debug: true });
  
  // Ritorna nel formato MongoDB raw per compatibilità
  return faqs.map(faq => ({
    _id: { toString: () => faq.id },
    userId: faq.userId,
    question: faq.question,
    answer: faq.answer,
    createdAt: faq.createdAt,
    updatedAt: faq.updatedAt,
  }));
}

/**
 * Test utility per vedere cosa caricherebbe il sistema
 */
export async function debugFaqLoading(userId: string, limit: number = 10) {
  console.log('\n=== FAQ LOADING DEBUG ===');
  console.log(`User: ${userId}, Limit: ${limit}`);
  
  // Metodo originale (quello che fa attualmente)
  const { db } = await connectToDatabase();
  const originalFaqs = await db.collection('faqs').find({ userId }).limit(limit).toArray();
  console.log('\n📊 METODO ORIGINALE (casuale):');
  originalFaqs.forEach((faq, i) => {
    console.log(`  ${i + 1}. "${faq.question.substring(0, 50)}..."`);
  });
  
  // Metodo migliorato
  const enhancedFaqs = await loadEnhancedFaqs(userId, limit, { debug: false });
  console.log('\n✨ METODO MIGLIORATO:');
  enhancedFaqs.forEach((faq, i) => {
    const age = faq.createdAt ? Math.round((Date.now() - faq.createdAt.getTime()) / (1000 * 60 * 60)) : '?';
    console.log(`  ${i + 1}. "${faq.question.substring(0, 50)}..." (${age}h old)`);
  });
  
  // Confronto
  const latestOriginal = originalFaqs[0]?.createdAt || new Date(0);
  const latestEnhanced = enhancedFaqs[0]?.createdAt || new Date(0);
  
  console.log('\n🔍 CONFRONTO:');
  console.log(`Originale - FAQ più recente: ${latestOriginal.toLocaleString()}`);
  console.log(`Migliorato - FAQ più recente: ${latestEnhanced.toLocaleString()}`);
  console.log(`Miglioramento: ${latestEnhanced > latestOriginal ? '✅ Migliore' : '❌ Peggiore'}`);
  
  return { originalFaqs, enhancedFaqs };
}
