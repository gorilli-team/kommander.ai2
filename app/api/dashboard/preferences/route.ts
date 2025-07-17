import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { connectToDatabase } from '@/backend/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const userId = new ObjectId(session.user.id);

    // Ottieni preferenze utente
    const userPreferences = await db.collection('userPreferences').findOne({ userId });

    const defaultPreferences = {
      dashboardLayout: {
        showStatistics: true,
        showNotifications: true,
        showRecentActivities: true,
        showQuickActions: true,
        statisticsOrder: ['aiStatus', 'conversations', 'knowledgeBase', 'documents']
      },
      notifications: {
        emailNotifications: true,
        pushNotifications: true,
        performanceAlerts: true,
        teamUpdates: true,
        systemUpdates: true
      },
      theme: {
        preferredTheme: 'system',
        compactMode: false
      }
    };

    const preferences = userPreferences ? 
      { ...defaultPreferences, ...userPreferences.preferences } : 
      defaultPreferences;

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await request.json();
    const { db } = await connectToDatabase();
    const userId = new ObjectId(session.user.id);

    // Aggiorna o crea preferenze utente
    await db.collection('userPreferences').updateOne(
      { userId },
      { 
        $set: { 
          preferences,
          updatedAt: new Date()
        },
        $setOnInsert: { 
          userId,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
