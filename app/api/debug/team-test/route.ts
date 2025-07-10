import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { organizationService } from '@/backend/lib/organizationService';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting Team Management debug test...');
    
    // Test environment info
    const envInfo = {
      nodeEnv: process.env.NODE_ENV,
      hasMongoUri: !!process.env.MONGODB_URI,
      hasAuthSecret: !!process.env.AUTH_SECRET,
      bypassAuth: process.env.BYPASS_AUTH
    };
    console.log('Environment info:', envInfo);
    
    // Test 1: Check session
    const session = await auth();
    console.log('Session check:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    });
    
    // Allow debug even without session for troubleshooting
    const debugUserId = session?.user?.id || '507f1f77bcf86cd799439011'; // Valid ObjectId for testing
    
    if (!session?.user?.id) {
      console.log('⚠️ No session found, using mock user for debug purposes');
    }

    // Test 2: Check database connection
    console.log('Testing database connection...');
    const { connectToDatabase } = await import('@/backend/lib/mongodb');
    const { db } = await connectToDatabase();
    await db.admin().ping();
    console.log('✅ Database connection successful');

    // Test 3: Test organization service initialization
    console.log('Testing organization service...');
    let organizations = [];
    try {
      organizations = await organizationService.getUserOrganizations(debugUserId);
      console.log('User organizations:', organizations.length);
    } catch (orgError: any) {
      console.error('❌ Error getting user organizations:', orgError.message);
    }

    // Test 4: Try creating a test organization
    console.log('Testing organization creation...');
    let testOrgId = null;
    let createdOrg = null;
    try {
      testOrgId = await organizationService.createOrganization({
        name: 'Debug Test Organization',
        slug: 'debug-test-' + Date.now(),
        description: 'Test organization for debugging',
        ownerId: debugUserId,
        settings: {
          allowPublicJoin: false,
          requireApproval: true,
          defaultRole: 'user',
          maxMembers: 10
        }
      });
      
      console.log('✅ Test organization created:', testOrgId);

      // Test 5: Verify creation
      createdOrg = await organizationService.getOrganization(testOrgId, debugUserId);
      console.log('✅ Organization retrieved:', createdOrg?.name);
    } catch (createError: any) {
      console.error('❌ Error creating organization:', createError.message);
      console.error('Stack:', createError.stack);
    }

    return NextResponse.json({
      success: !!testOrgId,
      message: testOrgId ? 'All Team Management tests passed!' : 'Some tests failed - check logs',
      environment: envInfo,
      data: {
        sessionValid: !!session?.user?.id,
        databaseConnected: true,
        organizationServiceWorking: !!testOrgId,
        testOrganizationId: testOrgId,
        testOrganizationName: createdOrg?.name,
        userOrganizations: organizations.length,
        debugUserId,
        mockUser: !session?.user?.id
      }
    });

  } catch (error: any) {
    console.error('❌ Team Management test failed:', error);
    
    return NextResponse.json({
      error: 'Team Management test failed',
      message: error.message,
      stack: error.stack,
      step: 'execution'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Testing organization creation with data:', body);

    const organizationId = await organizationService.createOrganization({
      ...body,
      ownerId: session.user.id
    });

    return NextResponse.json({
      success: true,
      organizationId,
      message: 'Organization created successfully via debug endpoint'
    });

  } catch (error: any) {
    console.error('❌ Debug organization creation failed:', error);
    
    return NextResponse.json({
      error: 'Failed to create organization in debug mode',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
