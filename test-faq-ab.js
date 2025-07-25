/**
 * Script di test per il sistema A/B delle FAQ
 * 
 * Questo script simula alcune domande per vedere come funziona
 * il sistema di logging non invasivo.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:9002';
const USER_ID = '685544ca738c18584b47bdca'; // L'userId che vediamo nei log

const testQuestions = [
  "Come posso migliorare le prestazioni del mio chatbot?",
  "Quali sono i costi del servizio?",
  "Come integro il widget nel mio sito?",
  "Il chatbot supporta più lingue?",
  "Come posso personalizzare le risposte?",
  "C'è un limite al numero di conversazioni?",
  "Come funziona l'integrazione con WhatsApp?",
];

async function testKommanderQueryStream(question) {
  console.log(`\n🧪 Testing Kommander Query Stream: "${question}"`);
  
  try {
    const response = await axios.post(`${BASE_URL}/api/kommander-query-stream`, {
      userId: USER_ID,
      message: question,
      history: [],
      conversationId: null,
      site: 'test'
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000
    });

    console.log(`✅ Response status: ${response.status}`);
    
    // Parse the SSE stream (simplified for testing)
    const chunks = response.data.split('data: ');
    let responseText = '';
    
    for (const chunk of chunks) {
      if (chunk.trim()) {
        try {
          const data = JSON.parse(chunk.trim());
          if (data.type === 'chunk') {
            responseText += data.content;
          } else if (data.type === 'complete') {
            console.log(`✅ Stream completed, response length: ${responseText.length}`);
            break;
          } else if (data.type === 'error') {
            console.log(`❌ Error: ${data.error}`);
            break;
          }
        } catch (e) {
          // Skip invalid JSON chunks
        }
      }
    }
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('⏱️  Request timed out (this is normal for streaming)');
    } else {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

async function testKommanderDirectChat(question) {
  console.log(`\n🧪 Testing Kommander Direct Chat: "${question}"`);
  
  try {
    const response = await axios.post(`${BASE_URL}/api/kommander-direct-chat`, {
      userId: USER_ID,
      message: question,
      history: [],
      conversationId: null,
      site: 'test'
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000
    });

    console.log(`✅ Response status: ${response.status}`);
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('⏱️  Request timed out (this is normal for streaming)');
    } else {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

async function runTests() {
  console.log('🚀 Avvio test sistema A/B per FAQ...\n');
  console.log('Questo script testerà entrambi gli endpoint per vedere i log del test A/B.');
  console.log('Controlla la console del server per vedere i risultati dettagliati.\n');
  
  for (let i = 0; i < testQuestions.length; i++) {
    const question = testQuestions[i];
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`TEST ${i + 1}/${testQuestions.length}`);
    console.log(`${'='.repeat(80)}`);
    
    // Test entrambi gli endpoint con la stessa domanda
    await testKommanderQueryStream(question);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
    
    await testKommanderDirectChat(question);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Delay between tests
  }
  
  console.log('\n✅ Test completati!');
  console.log('Controlla i log del server per vedere:');
  console.log('- [FaqTest] per i risultati del confronto A/B');
  console.log('- [FaqSelection] per la selezione delle FAQ');
  console.log('- Analisi delle FAQ escluse e delle migliori alternative');
}

// Run the tests
runTests().catch(console.error);
