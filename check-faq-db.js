const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkFAQs() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('kommander_ai_prototype');
    
    // Trova la FAQ specifica
    const faq = await db.collection('faqs').findOne({
      question: { $regex: /movo.*noleggio.*comodato/i }
    });
    
    console.log('FAQ Found:', !!faq);
    
    if (faq) {
      console.log('\n=== FAQ DETAILS ===');
      console.log('Question:', faq.question);
      console.log('Answer length:', faq.answer.length);
      console.log('Answer preview:', faq.answer.substring(0, 200) + '...');
      console.log('Has embedding:', !!faq.embedding);
      console.log('Has links in answer:', faq.answer.includes('http'));
      
      if (faq.answer.includes('http')) {
        const links = faq.answer.match(/https?:\/\/[^\s]+/g);
        console.log('Links found:', links);
      }
    }
    
    // Controlla tutte le FAQ con link
    const faqsWithLinks = await db.collection('faqs').find({
      answer: { $regex: /https?:\/\// }
    }).toArray();
    
    console.log('\n=== FAQs WITH LINKS ===');
    console.log(`Found ${faqsWithLinks.length} FAQs with links`);
    
    faqsWithLinks.slice(0, 3).forEach((faq, index) => {
      console.log(`${index + 1}. ${faq.question.substring(0, 50)}...`);
      const links = faq.answer.match(/https?:\/\/[^\s]+/g);
      console.log(`   Links: ${links ? links.join(', ') : 'None'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkFAQs();
