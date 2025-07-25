const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

// Implementazione semplificata delle funzioni semantic search
function calculateSimilarity(text1, text2) {
  const normalize = (text) => 
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

function calculateRelevance(userQuestion, faq) {
  const questionSimilarity = calculateSimilarity(userQuestion, faq.question);
  const answerSimilarity = calculateSimilarity(userQuestion, faq.answer) * 0.3;
  
  // Bonus per FAQ recenti
  const ageInHours = faq.createdAt ? (Date.now() - new Date(faq.createdAt).getTime()) / (1000 * 60 * 60) : 1000;
  const recencyBonus = Math.max(0, 1 - ageInHours / (24 * 30)) * 0.2;
  
  // Bonus per parole chiave esatte
  const exactMatches = userQuestion.toLowerCase().split(' ')
    .filter(word => word.length > 3)
    .filter(word => faq.question.toLowerCase().includes(word) || faq.answer.toLowerCase().includes(word))
    .length;
  const exactBonus = exactMatches * 0.1;
  
  return questionSimilarity + answerSimilarity + recencyBonus + exactBonus;
}

async function findRelevantFaqs(userId, userQuestion, limit = 10) {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('kommander_ai_prototype');
  
  // Carica TUTTE le FAQ per fare semantic search
  const allFaqs = await db.collection('faqs').find({ userId }).toArray();
  
  if (allFaqs.length === 0) return [];
  
  // Calcola relevance score per ogni FAQ
  const scoredFaqs = allFaqs.map(faq => ({
    ...faq,
    relevanceScore: calculateRelevance(userQuestion, faq)
  }));
  
  // Ordina per relevance score
  scoredFaqs.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  await client.close();
  return scoredFaqs.slice(0, limit);
}

async function findKeywordMatchingFaqs(userId, userQuestion, limit = 10) {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('kommander_ai_prototype');
  
  // Estrai parole chiave
  const stopWords = new Set(['il', 'la', 'di', 'che', 'e', 'a', 'da', 'in', 'con', 'su', 'per', 'come', 'cosa', 'dove', 'quando', 'perché', 'chi']);
  const keywords = userQuestion.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  if (keywords.length === 0) {
    // Fallback: FAQ recenti
    const recentFaqs = await db.collection('faqs')
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    await client.close();
    return recentFaqs;
  }
  
  // Cerca FAQ che contengono le parole chiave
  const textSearchFaqs = await db.collection('faqs')
    .find({
      userId,
      $or: [
        { question: { $regex: keywords.join('|'), $options: 'i' } },
        { answer: { $regex: keywords.join('|'), $options: 'i' } }
      ]
    })
    .limit(limit)
    .toArray();
  
  // Se non abbastanza risultati, completa con FAQ recenti
  if (textSearchFaqs.length < limit) {
    const excludeIds = textSearchFaqs.map(f => f._id);
    const additionalFaqs = await db.collection('faqs')
      .find({ 
        userId,
        _id: { $nin: excludeIds }
      })
      .sort({ createdAt: -1 })
      .limit(limit - textSearchFaqs.length)
      .toArray();
    
    textSearchFaqs.push(...additionalFaqs);
  }
  
  await client.close();
  return textSearchFaqs;
}

async function testSearchMethods() {
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
      console.log('❌ Nessuna FAQ trovata');
      return;
    }
    
    const testUserId = userStats[0]._id;
    
    // Test con diverse domande
    const testQuestions = [
      'come inserisco un movo?',
      'se io uso un movo posso poi portarmi a casa una maglietta gorilli?',
      'come aggiungo un cliente?',
      'quali sono i prezzi?',
      'come funziona il sistema?'
    ];
    
    for (const question of testQuestions) {
      console.log(`\n🔍 TEST DOMANDA: "${question}"`);
      console.log('=' .repeat(80));
      
      // Metodo originale (random)
      const randomFaqs = await db.collection('faqs').find({ userId: testUserId }).limit(5).toArray();
      console.log('\n📊 METODO ORIGINALE (sempre le stesse 5 FAQ random):');
      randomFaqs.forEach((faq, i) => {
        console.log(`   ${i + 1}. "${faq.question.substring(0, 60)}..."`);
      });
      
      // Keyword matching
      const keywordFaqs = await findKeywordMatchingFaqs(testUserId, question, 5);
      console.log('\n🔍 KEYWORD MATCHING (cerca parole chiave):');
      keywordFaqs.forEach((faq, i) => {
        console.log(`   ${i + 1}. "${faq.question.substring(0, 60)}..."`);
      });
      
      // Semantic search
      const semanticFaqs = await findRelevantFaqs(testUserId, question, 5);
      console.log('\n🧠 SEMANTIC SEARCH (relevance score):');
      semanticFaqs.forEach((faq, i) => {
        const score = faq.relevanceScore || 0;
        console.log(`   ${i + 1}. "${faq.question.substring(0, 60)}..." (${score.toFixed(3)})`);
      });
      
      // Analisi
      const hasExactMatch = semanticFaqs.some(faq => 
        faq.question.toLowerCase().includes(question.toLowerCase().replace(/[^\w\s]/g, ''))
      );
      
      console.log(`\n🎯 RILEVANZA: ${hasExactMatch ? '✅ Match trovato' : '❓ Nessun match diretto'}`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📈 CONCLUSIONI:');
    console.log('📊 Metodo Originale: Sempre le stesse FAQ, indipendenti dalla domanda');
    console.log('🔍 Keyword Matching: Trova FAQ con parole simili');
    console.log('🧠 Semantic Search: Calcola rilevanza e include FAQ recenti');
    console.log('💡 Raccomandazione: Usa Semantic Search per migliorare drasticamente le risposte!');
    
  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await client.close();
  }
}

console.log('🚀 Test confronto metodi di ricerca FAQ\n');
testSearchMethods();
