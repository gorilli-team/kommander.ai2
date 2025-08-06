const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

/**
 * Database Cleanup Script for Corrupted FAQ Records
 * 
 * This script identifies and removes FAQ records that have:
 * - userId: null, undefined, or empty string
 * - Missing userId field entirely
 * 
 * These corrupted records can cause user data leakage in organization contexts.
 */

async function cleanupCorruptedFaqs() {
  console.log('🚀 Starting FAQ database cleanup...\n');
  
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('kommander_ai_prototype');
    
    // Find all corrupted FAQ records
    console.log('\n🔍 Identifying corrupted FAQ records...');
    
    const corruptedFaqs = await db.collection('faqs').find({
      $or: [
        { userId: { $exists: false } },
        { userId: null },
        { userId: undefined },
        { userId: '' }
      ]
    }).toArray();
    
    console.log(`📊 Found ${corruptedFaqs.length} corrupted FAQ records\n`);
    
    if (corruptedFaqs.length === 0) {
      console.log('✅ No corrupted FAQs found. Database is clean!');
      return;
    }
    
    // Display details of corrupted FAQs
    console.log('📋 CORRUPTED FAQ DETAILS:');
    corruptedFaqs.forEach((faq, i) => {
      console.log(`\n${i + 1}. FAQ ID: ${faq._id}`);
      console.log(`   userId: ${faq.userId}`);
      console.log(`   organizationId: ${faq.organizationId || 'N/A'}`);
      console.log(`   Question: "${faq.question?.substring(0, 80)}..."`);
      console.log(`   Created: ${faq.createdAt || 'N/A'}`);
    });
    
    // Confirm deletion
    console.log('\n⚠️  WARNING: This will permanently delete these corrupted FAQ records.');
    console.log('   This action cannot be undone, but it\'s necessary to prevent data leakage.');
    
    // In a production environment, you might want to add a confirmation prompt
    // For now, we'll proceed automatically since these are corrupted records
    
    console.log('\n🗑️  Proceeding with cleanup...');
    
    // Delete corrupted FAQs
    const deleteResult = await db.collection('faqs').deleteMany({
      $or: [
        { userId: { $exists: false } },
        { userId: null },
        { userId: undefined },
        { userId: '' }
      ]
    });
    
    console.log(`\n✅ CLEANUP COMPLETE!`);
    console.log(`   - Deleted ${deleteResult.deletedCount} corrupted FAQ records`);
    console.log(`   - Database is now secure from user data leakage`);
    
    // Verify cleanup
    const remainingCorrupted = await db.collection('faqs').countDocuments({
      $or: [
        { userId: { $exists: false } },
        { userId: null },
        { userId: undefined },
        { userId: '' }
      ]
    });
    
    if (remainingCorrupted === 0) {
      console.log(`   - ✅ Verification passed: No corrupted records remain`);
    } else {
      console.log(`   - ❌ Warning: ${remainingCorrupted} corrupted records still exist`);
    }
    
    // Show final stats
    const totalFaqs = await db.collection('faqs').countDocuments();
    const validFaqs = await db.collection('faqs').countDocuments({
      userId: { $exists: true, $ne: null, $ne: '' }
    });
    
    console.log(`\n📈 FINAL DATABASE STATE:`);
    console.log(`   - Total FAQs: ${totalFaqs}`);
    console.log(`   - Valid FAQs: ${validFaqs}`);
    console.log(`   - Success rate: ${totalFaqs > 0 ? (validFaqs / totalFaqs * 100).toFixed(1) : 100}%`);
    
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  console.log('🛠️  FAQ Database Cleanup Tool');
  console.log('================================');
  cleanupCorruptedFaqs()
    .then(() => {
      console.log('\n🎉 Cleanup completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { cleanupCorruptedFaqs };
