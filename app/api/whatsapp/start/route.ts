import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { whatsappManager } from '@/backend/lib/whatsappClient';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    console.log(`🚀 Avvio bot WhatsApp per utente ${userId}`);
    
    const result = await whatsappManager.startBot(userId);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        qrCode: result.qrCode,
        message: 'Bot avviato con successo'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Errore sconosciuto'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Errore avvio bot:', error);
    return NextResponse.json(
      { error: error.message || 'Errore interno del server' },
      { status: 500 }
    );
  }
}
