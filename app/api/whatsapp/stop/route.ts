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
    
    console.log(`🛑 Arresto bot WhatsApp per utente ${userId}`);
    
    const success = await whatsappManager.stopBot(userId);
    
    return NextResponse.json({
      success,
      message: success ? 'Bot disconnesso con successo' : 'Nessun bot attivo trovato'
    });

  } catch (error: any) {
    console.error('❌ Errore arresto bot:', error);
    return NextResponse.json(
      { error: error.message || 'Errore interno del server' },
      { status: 500 }
    );
  }
}
