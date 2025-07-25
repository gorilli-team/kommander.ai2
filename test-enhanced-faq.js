const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

// Simulazione del modulo enhancedFaqLoader (senza TypeScript)
async function loadEnhancedFaqs(userId, limit = 10, options = {}) {
  const {
    recentPercentage = 0.3,
    mustIncludeHours = 24,
    debug = false
  } = options;
  
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('kommander_ai_prototype');
  
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
  
  await client.close();
  return allFaqs;
}

async function testComparison() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('kommander_ai_prototype');
    
    // Trova l'utente con più FAQ
    const userStats = await db.collection('faqs').aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]).toArray();
    
    if (userStats.length === 0) {
      console.log('❌ Nessuna FAQ trovata nel database');
      return;
    }
    
    const testUserId = userStats[0]._id;
    const totalFaqs = userStats[0].count;
    
    console.log(`🧪 TESTING FAQ LOADING COMPARISON`);
    console.log(`👤 User: ${testUserId}`);
    console.log(`📊 Total FAQs: ${totalFaqs}`);
    console.log(`🎯 Testing with limit: 10\n`);
    
    // === METODO ORIGINALE (quello attuale) ===
    console.log('📊 METODO ORIGINALE (random order):');
    const originalFaqs = await db.collection('faqs').find({ userId: testUserId }).limit(10).toArray();
    originalFaqs.forEach((faq, i) => {
      const age = faq.createdAt ? Math.round((Date.now() - faq.createdAt.getTime()) / (1000 * 60 * 60)) : '?';
      console.log(`   ${i + 1}. "${faq.question.substring(0, 60)}..." (${age}h old)`);
    });
    
    // === METODO MIGLIORATO ===
    console.log('\n✨ METODO MIGLIORATO (recent-first):');
    const enhancedFaqs = await loadEnhancedFaqs(testUserId, 10, { debug: true });
    enhancedFaqs.forEach((faq, i) => {
      const age = faq.createdAt ? Math.round((Date.now() - faq.createdAt.getTime()) / (1000 * 60 * 60)) : '?';
      console.log(`   ${i + 1}. "${faq.question.substring(0, 60)}..." (${age}h old)`);
    });
    
    // === ANALISI ===
    console.log('\n🔍 ANALISI:');
    
    // FAQ più recente in ciascun metodo
    const originalNewest = originalFaqs.reduce((newest, faq) => 
      (!newest || faq.createdAt > newest.createdAt) ? faq : newest, null);
    const enhancedNewest = enhancedFaqs.reduce((newest, faq) => 
      (!newest || faq.createdAt > newest.createdAt) ? faq : newest, null);
    
    console.log(`📅 Originale - FAQ più recente: ${originalNewest?.createdAt?.toLocaleString() || 'N/A'}`);
    console.log(`📅 Migliorato - FAQ più recente: ${enhancedNewest?.createdAt?.toLocaleString() || 'N/A'}`);
    
    // Conta FAQ create nelle ultime 24h
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const originalRecent = originalFaqs.filter(f => f.createdAt >= last24h).length;
    const enhancedRecent = enhancedFaqs.filter(f => f.createdAt >= last24h).length;
    
    console.log(`⏰ FAQ ultime 24h - Originale: ${originalRecent}/10, Migliorato: ${enhancedRecent}/10`);
    
    // Verifica se l'ultima FAQ creata è inclusa
    const absoluteLatest = await db.collection('faqs')
      .findOne({ userId: testUserId }, { sort: { createdAt: -1 } });
    
    const originalHasLatest = originalFaqs.some(f => f._id.toString() === absoluteLatest._id.toString());
    const enhancedHasLatest = enhancedFaqs.some(f => f._id.toString() === absoluteLatest._id.toString());
    
    console.log(`🏆 Include ultima FAQ creata - Originale: ${originalHasLatest ? '✅' : '❌'}, Migliorato: ${enhancedHasLatest ? '✅' : '❌'}`);
    
    console.log('\n🎯 VERDETTO:');
    if (enhancedRecent > originalRecent) {
      console.log('✅ Il metodo migliorato include più FAQ recenti');
    } else if (enhancedRecent === originalRecent) {
      console.log('🤝 Entrambi i metodi includono lo stesso numero di FAQ recenti');
    } else {
      console.log('❌ Il metodo originale include più FAQ recenti (caso raro)');
    }
    
    if (enhancedHasLatest && !originalHasLatest) {
      console.log('🚀 Il metodo migliorato garantisce sempre l\'inclusione dell\'ultima FAQ!');
    }
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  } finally {
    await client.close();
  }
}

console.log('🚀 Avvio confronto metodi di caricamento FAQ...\n');
testComparison();
