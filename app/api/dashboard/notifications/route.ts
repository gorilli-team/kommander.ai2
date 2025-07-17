import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/frontend/auth';
import { connectToDatabase } from '@/backend/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const userId = new ObjectId(session.user.id);

    // Ottieni notifiche non lette
    const notifications = await db.collection('notifications')
      .find({ 
        userId,
        read: false 
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    const formattedNotifications = notifications.map(notification => ({
      id: notification._id.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      icon: notification.icon,
      color: notification.color,
      createdAt: notification.createdAt,
      read: notification.read
    }));

    return NextResponse.json({
      notifications: formattedNotifications,
      unreadCount: formattedNotifications.length
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notificationId, read } = await request.json();
    const { db } = await connectToDatabase();
    const userId = new ObjectId(session.user.id);

    if (notificationId) {
      // Marca una notifica specifica come letta/non letta
      await db.collection('notifications').updateOne(
        { 
          _id: new ObjectId(notificationId),
          userId 
        },
        { $set: { read, updatedAt: new Date() } }
      );
    } else {
      // Marca tutte le notifiche come lette
      await db.collection('notifications').updateMany(
        { userId },
        { $set: { read: true, updatedAt: new Date() } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
