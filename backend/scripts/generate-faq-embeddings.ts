import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { generateEmbedding } from '@/backend/lib/embeddings';

// Load environment variables
dotenv.config({ path: '.env.local' });

/**
 * Script to generate embeddings for existing FAQs
 * Run with: npx tsx backend/scripts/generate-faq-embeddings.ts
 */
async function generateFAQEmbeddings() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Error: MONGODB_URI is not defined in .env.local');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('[generate-faq-embeddings] Connected to MongoDB');
    
    const dbNameFromUri = uri.split('/').pop()?.split('?')[0];
    const dbName = dbNameFromUri || 'kommander_ai_prototype';
    const db = client.db(dbName);
    
    const faqsCollection = db.collection('faqs');
    
    // Find FAQs without embeddings
    const faqsWithoutEmbeddings = await faqsCollection.find({
      $or: [
        { embedding: { $exists: false } },
        { embedding: { $size: 0 } },
        { embedding: null }
      ]
    }).toArray();
    
    console.log(`[generate-faq-embeddings] Found ${faqsWithoutEmbeddings.length} FAQs without embeddings`);
    
    if (faqsWithoutEmbeddings.length === 0) {
      console.log('[generate-faq-embeddings] All FAQs already have embeddings');
      return;
    }
    
    let processed = 0;
    let failed = 0;
    
    for (const faq of faqsWithoutEmbeddings) {
      try {
        console.log(`[generate-faq-embeddings] Processing FAQ ${processed + 1}/${faqsWithoutEmbeddings.length}: ${faq.question.substring(0, 50)}...`);
        
        const embedding = await generateEmbedding(faq.question);
        
        await faqsCollection.updateOne(
          { _id: faq._id },
          { 
            $set: { 
              embedding,
              updatedAt: new Date()
            }
          }
        );
        
        processed++;
        console.log(`[generate-faq-embeddings] ✅ Generated embedding for FAQ: ${faq.question.substring(0, 50)}...`);
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        failed++;
        console.error(`[generate-faq-embeddings] ❌ Failed to generate embedding for FAQ ID ${faq._id}:`, error);
      }
    }
    
    console.log(`[generate-faq-embeddings] Completed: ${processed} processed, ${failed} failed`);
    
  } catch (error) {
    console.error('[generate-faq-embeddings] Error:', error);
  } finally {
    await client.close();
    console.log('[generate-faq-embeddings] MongoDB connection closed');
  }
}

// Run the script
if (require.main === module) {
  generateFAQEmbeddings().catch(console.error);
}

export { generateFAQEmbeddings };
