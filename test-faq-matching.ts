// Test FAQ semantic matching
import { handleFAQQuery } from './backend/lib/faqHandler';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testFAQMatching() {
  console.log('🧪 Testing FAQ Semantic Matching...\n');
  
  const testQueries = [
    'Come posso cambiare cliente durante inserimento?',
    'What are the prices for PACK PRO?',
    'Come attivo CARGOS?',
    'Cosa sono i movimenti non produttivi?',
    'Come inserisco un nuovo veicolo?',
    'Questa domanda non dovrebbe avere match',
    'Random question about something unrelated'
  ];
  
  for (const query of testQueries) {
    console.log(`🔍 Testing query: "${query}"`);
    
    try {
      const result = await handleFAQQuery(query);
      
      if (result.isFaqMatch) {
        console.log(`✅ FAQ MATCH FOUND!`);
        console.log(`   Similarity: ${result.similarity?.toFixed(3)}`);
        console.log(`   FAQ ID: ${result.faqId}`);
        console.log(`   Answer: ${result.answer.substring(0, 100)}...`);
      } else {
        console.log(`❌ No FAQ match found (would use LLM)`);
      }
    } catch (error: any) {
      console.log(`💥 Error: ${error.message}`);
    }
    
    console.log('─'.repeat(60));
  }
}

testFAQMatching().catch(console.error);
