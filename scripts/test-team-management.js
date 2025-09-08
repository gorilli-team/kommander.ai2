#!/usr/bin/env node
/**
 * Test script per Team Management
 * 
 * Esegui con: node scripts/test-team-management.js
 * 
 * Questo script testa:
 * 1. Connessione al database
 * 2. OrganizationService
 * 3. Creazione organizzazione
 * 4. Aggiunta membri
 * 5. Sistema inviti
 */

require('dotenv').config({ path: '.env.local' });

const { connectToDatabase } = require('../backend/lib/mongodb');
const { organizationService } = require('../backend/lib/organizationService');

async function testDatabaseConnection() {
  console.log('🔌 Testing database connection...');
  try {
    const { db } = await connectToDatabase();
    const result = await db.admin().ping();
    console.log('✅ Database connection successful!');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function testOrganizationService() {
  console.log('\n🏢 Testing Organization Service...');
  
  try {
    // Test creazione organizzazione
    console.log('Creating test organization...');
    const testOrgId = await organizationService.createOrganization({
      name: 'Test Organization',
      slug: 'test-org-' + Date.now(),
      description: 'Test organization for Team Management',
      ownerId: '507f1f77bcf86cd799439011', // Mock ObjectId
      settings: {
        allowPublicJoin: false,
        requireApproval: true,
        defaultRole: 'user',
        maxMembers: 10
      }
    });
    
    console.log('✅ Organization created with ID:', testOrgId);
    
    // Test lettura organizzazione
    const org = await organizationService.getOrganization(testOrgId);
    console.log('✅ Organization retrieved:', org?.name);
    
    // Add another member (mock)
    console.log('Adding a test member...');
    const secondUserId = '507f1f77bcf86cd799439012';
    await organizationService.addMember({
      organizationId: testOrgId,
      userId: secondUserId,
      role: 'manager',
      status: 'active',
      invitedBy: '507f1f77bcf86cd799439011'
    });
    console.log('✅ Test member added');

    // Test update organization
    console.log('Updating organization name/description...');
    const updatedOrg = await organizationService.updateOrganization(testOrgId, '507f1f77bcf86cd799439011', {
      name: 'Test Organization Updated',
      description: 'Updated description'
    });
    console.log('✅ Organization updated:', updatedOrg?.name);

    // Test creazione invito
    console.log('Creating test invitation...');
    const token = await organizationService.createInvitation({
      organizationId: testOrgId,
      email: 'test@example.com',
      role: 'user',
      invitedBy: '507f1f77bcf86cd799439011',
      message: 'Welcome to our test team!'
    });
    
    console.log('✅ Invitation created with token:', token.substring(0, 8) + '...');
    
    // Test lettura invito
    const invitation = await organizationService.getInvitationByToken(token);
    console.log('✅ Invitation retrieved for email:', invitation?.email);

    console.log('\n✅ All Organization Service tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Organization Service test failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

async function testEmailConfiguration() {
  console.log('\n📧 Testing email configuration...');
  
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.FRONTEND_URL;
  
  console.log('RESEND_API_KEY:', resendApiKey ? '✅ Set' : '❌ Missing');
  console.log('EMAIL_FROM:', emailFrom ? '✅ Set' : '⚠️  Using default');
  console.log('APP_URL:', appUrl ? '✅ Set' : '⚠️  Using localhost');
  
  if (!resendApiKey) {
    console.log('⚠️  Email invitations will not work without RESEND_API_KEY');
    return false;
  }
  
  return true;
}

async function runTests() {
  console.log('🧪 Starting Team Management Tests\n');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Missing');
  
  const results = {
    database: await testDatabaseConnection(),
    organizationService: false,
    emailConfig: await testEmailConfiguration()
  };
  
  if (results.database) {
    results.organizationService = await testOrganizationService();
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log('Database Connection:', results.database ? '✅' : '❌');
  console.log('Organization Service:', results.organizationService ? '✅' : '❌');
  console.log('Email Configuration:', results.emailConfig ? '✅' : '⚠️');
  
  const allPassed = results.database && results.organizationService;
  
  if (allPassed) {
    console.log('\n🎉 All critical tests passed! Team Management is ready to use.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }
  
  console.log('\n📍 Next steps:');
  console.log('1. Visit http://localhost:9002/team to access Team Management');
  console.log('2. Make sure you have a valid user session');
  console.log('3. Configure RESEND_API_KEY for email invitations');
  
  process.exit(allPassed ? 0 : 1);
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run tests
runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
