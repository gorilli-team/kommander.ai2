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

    // Ottieni statistiche FAQ
    const faqCount = await db.collection('faqs').countDocuments({ userId });
    
    // Ottieni statistiche documenti
    const documentsCount = await db.collection('documents').countDocuments({ userId });
    
    // Ottieni statistiche conversazioni (ultima settimana)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const conversationsThisWeek = await db.collection('conversations').countDocuments({
      userId,
      createdAt: { $gte: oneWeekAgo }
    });

    // Ottieni statistiche totali conversazioni
    const totalConversations = await db.collection('conversations').countDocuments({ userId });

    // Calcola completezza base di conoscenza
    const knowledgeBaseCompleteness = Math.min(
      100,
      Math.round((faqCount * 10 + documentsCount * 20) / 2)
    );

    // Stato AI (simulato - in produzione potresti avere un sistema di monitoraggio)
    const aiStatus = 'online';

    // Ottieni attività recenti
    const recentActivities = await db.collection('activities')
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    const stats = {
      aiStatus,
      conversationsThisWeek,
      totalConversations,
      knowledgeBaseCompleteness,
      documentsCount,
      faqCount,
      recentActivities: recentActivities.map(activity => ({
        id: activity._id.toString(),
        type: activity.type,
        description: activity.description,
        createdAt: activity.createdAt,
        color: activity.color || 'blue'
      }))
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
