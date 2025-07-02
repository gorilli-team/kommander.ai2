import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/frontend/auth';
import { whatsappManager } from '@/backend/lib/whatsappClient';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    const status = await whatsappManager.getBotStatus(userId);
    
    return NextResponse.json({
      status: status || {
        isConnected: false,
        phoneNumber: undefined,
        lastActivity: undefined,
        qrCode: undefined
      }
    });

  } catch (error: any) {
    console.error('❌ Errore recupero stato bot:', error);
    return NextResponse.json(
      { error: error.message || 'Errore interno del server' },
      { status: 500 }
    );
  }
}
