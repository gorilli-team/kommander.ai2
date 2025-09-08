import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  WAMessage,
  proto,
  MessageUpsertType
} from 'baileys';
import { Boom } from '@hapi/boom';
import { generateChatResponse } from '@/app/chatbot/actions';
import { appendMessages } from '@/app/conversations/actions';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from './mongodb';
import type { WhatsAppIntegration, WhatsAppConnectionStatus } from '@/backend/schemas/whatsappIntegration';
import path from 'path';
import fs from 'fs';

class WhatsAppBot {
  private sock: any = null;
  private isConnected = false;
  private userId: string;
  private qrCode: string | null = null;
  private authPath: string;
  private phoneNumber: string | null = null;

  constructor(userId: string) {
    this.userId = userId;
    // Use /tmp in production (Vercel/serverless) or cwd in development
    const baseDir = process.env.VERCEL || process.env.NODE_ENV === 'production' 
      ? '/tmp' 
      : process.cwd();
    this.authPath = path.join(baseDir, `whatsapp-auth-${userId}`);
  }

  async start(): Promise<{ success: boolean; qrCode?: string; error?: string }> {
    try {
      console.log(`🚀 Avvio bot WhatsApp per utente ${this.userId}`);
      console.log(`📁 Auth path: ${this.authPath}`);
      
      // Crea directory auth se non esiste
      if (!fs.existsSync(this.authPath)) {
        console.log(`📁 Creazione directory: ${this.authPath}`);
        fs.mkdirSync(this.authPath, { recursive: true });
      }

      console.log(`🔐 Inizializzazione auth state...`);
      const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
      
      console.log(`🔌 Creazione socket WhatsApp...`);
      
      // Logger fittizio per Baileys
      const logger = {
        level: 'silent',
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        fatal: () => {},
        child: () => logger
      };
      
      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger,
        browser: ['Chrome (Linux)', '', ''],
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false
      });

      return new Promise((resolve) => {
        let hasResolved = false;
        
        // Gestione della connessione
        this.sock.ev.on('connection.update', async (update: any) => {
          const { connection, lastDisconnect, qr: qrCode } = update;
          
          console.log(`🔄 Connection update:`, { connection, hasQR: !!qrCode });
          
          if (qrCode && !hasResolved) {
            this.qrCode = qrCode;
            console.log(`📱 QR code generato per utente ${this.userId}`);
            await this.updateDatabaseStatus(false, qrCode);
            hasResolved = true;
            resolve({ success: true, qrCode });
          }

          if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`❌ Connessione chiusa per ${this.userId}:`, lastDisconnect?.error?.message);
            
            this.isConnected = false;
            await this.updateDatabaseStatus(false);
            
            if (!hasResolved) {
              hasResolved = true;
              resolve({ success: false, error: `Connessione chiusa: ${lastDisconnect?.error?.message}` });
            }
            
            if (shouldReconnect) {
              console.log(`🔄 Riconnessione per ${this.userId}...`);
              setTimeout(() => this.start(), 5000);
            }
          } else if (connection === 'open') {
            console.log(`✅ Bot WhatsApp connesso per utente ${this.userId}!`);
            this.isConnected = true;
            this.qrCode = null;
            
            // Ottieni numero di telefono
            if (this.sock.user?.id) {
              this.phoneNumber = this.sock.user.id.split(':')[0];
            }
            
            await this.updateDatabaseStatus(true);
          }
        });

        // Salva le credenziali
        this.sock.ev.on('creds.update', saveCreds);

        // Gestione messaggi in arrivo
        this.sock.ev.on('messages.upsert', async (m: { messages: WAMessage[], type: MessageUpsertType }) => {
          await this.handleMessages(m);
        });

        // Timeout per QR code
        setTimeout(() => {
          if (!hasResolved) {
            console.log(`⏰ Timeout per utente ${this.userId}`);
            hasResolved = true;
            resolve({ success: false, error: 'Timeout durante la generazione del QR code' });
          }
        }, 30000);
      });

    } catch (error: any) {
      console.error(`❌ Errore nell'avvio del bot WhatsApp per ${this.userId}:`, error);
      return { success: false, error: error.message || 'Errore sconosciuto' };
    }
  }

  private async handleMessages(m: { messages: WAMessage[], type: MessageUpsertType }) {
    try {
      for (const msg of m.messages) {
        // Ignora messaggi dal bot stesso
        if (msg.key.fromMe) continue;
        
        // Ignora messaggi di stato
        if (msg.key.remoteJid === 'status@broadcast') continue;

        const messageText = msg.message?.conversation || 
                           msg.message?.extendedTextMessage?.text || '';
        
        if (!messageText) continue;

        const from = msg.key.remoteJid!;
        const isGroup = from.includes('@g.us');
        
        // Ignora messaggi di gruppo per ora (opzionale)
        if (isGroup) continue;

        console.log(`📱 Messaggio da ${from}: ${messageText}`);

        // Genera risposta usando il tuo chatbot esistente
        await this.processMessage(from, messageText);
      }
    } catch (error) {
      console.error('❌ Errore nella gestione messaggi:', error);
    }
  }

  private async processMessage(from: string, messageText: string) {
    try {
      // Invia "sta scrivendo..."
      await this.sock.sendPresenceUpdate('composing', from);

      // Usa il tuo sistema di chatbot esistente
      // Creiamo un userId fittizio basato sul numero WhatsApp
      const userId = 'whatsapp_' + from.replace('@s.whatsapp.net', '');
      const conversationId = new ObjectId().toString();

      // Genera risposta
      const result = await generateChatResponse(messageText, [], userId);

      if (result.error) {
        await this.sendMessage(from, '❌ Scusa, ho avuto un problema. Riprova tra poco.');
        return;
      }

      // Salva conversazione
      await appendMessages(
        userId,
        conversationId,
        [
          { role: 'user', text: messageText, timestamp: new Date().toISOString() },
          { role: 'assistant', text: result.response as string, timestamp: new Date().toISOString() },
        ]
      );

      // Invia risposta
      await this.sendMessage(from, result.response as string);

    } catch (error) {
      console.error('❌ Errore nel processare messaggio:', error);
      await this.sendMessage(from, '❌ Scusa, ho avuto un problema tecnico. Riprova tra poco.');
    }
  }

  private async sendMessage(to: string, message: string) {
    try {
      if (!this.isConnected) {
        console.log('❌ Bot non connesso, impossibile inviare messaggio');
        return;
      }

      await this.sock.sendPresenceUpdate('paused', to);
      await this.sock.sendMessage(to, { text: message });
      console.log(`✅ Risposta inviata a ${to}: ${message.substring(0, 50)}...`);
    } catch (error) {
      console.error('❌ Errore nell\'invio messaggio:', error);
    }
  }

  private async updateDatabaseStatus(isConnected: boolean, qrCode?: string) {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<WhatsAppIntegration>('whatsappIntegrations');
      
      const updateData: Partial<WhatsAppIntegration> = {
        isConnected,
        updatedAt: new Date(),
        lastActivity: new Date()
      };
      
      if (qrCode) {
        updateData.qrCode = qrCode;
      } else {
        updateData.qrCode = undefined;
      }
      
      if (isConnected && this.phoneNumber) {
        updateData.phoneNumber = this.phoneNumber;
        updateData.connectedAt = new Date();
      }
      
      await collection.updateOne(
        { userId: this.userId },
        { 
          $set: updateData,
          $setOnInsert: {
            userId: this.userId,
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('❌ Errore aggiornamento database:', error);
    }
  }

  async getStatus(): Promise<WhatsAppConnectionStatus> {
    return {
      isConnected: this.isConnected,
      phoneNumber: this.phoneNumber || undefined,
      lastActivity: this.isConnected ? new Date() : undefined,
      qrCode: this.qrCode || undefined
    };
  }

  async stop() {
    try {
      if (this.sock) {
        await this.sock.end();
        this.isConnected = false;
        this.qrCode = null;
        this.phoneNumber = null;
        await this.updateDatabaseStatus(false);
        console.log(`🛑 Bot WhatsApp disconnesso per ${this.userId}`);
      }
      
      // Rimuovi directory auth
      if (fs.existsSync(this.authPath)) {
        fs.rmSync(this.authPath, { recursive: true, force: true });
      }
    } catch (error) {
      console.error('❌ Errore durante disconnessione:', error);
    }
  }
}

// Manager per gestire multiple istanze
class WhatsAppManager {
  private bots: Map<string, WhatsAppBot> = new Map();
  
  async startBot(userId: string): Promise<{ success: boolean; qrCode?: string; error?: string }> {
    // Se il bot esiste già, fermalo prima
    if (this.bots.has(userId)) {
      await this.stopBot(userId);
    }
    
    const bot = new WhatsAppBot(userId);
    this.bots.set(userId, bot);
    
    const result = await bot.start();
    
    if (!result.success) {
      this.bots.delete(userId);
    }
    
    return result;
  }
  
  async stopBot(userId: string): Promise<boolean> {
    const bot = this.bots.get(userId);
    if (bot) {
      await bot.stop();
      this.bots.delete(userId);
      return true;
    }
    return false;
  }
  
  async getBotStatus(userId: string): Promise<WhatsAppConnectionStatus | null> {
    const bot = this.bots.get(userId);
    if (bot) {
      return await bot.getStatus();
    }
    
    // Controlla database per stato persistente
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<WhatsAppIntegration>('whatsappIntegrations');
      const integration = await collection.findOne({ userId });
      
      if (integration) {
        return {
          isConnected: false, // Se non c'è bot attivo, non è connesso
          phoneNumber: integration.phoneNumber,
          lastActivity: integration.lastActivity,
          qrCode: integration.qrCode
        };
      }
    } catch (error) {
      console.error('❌ Errore nel recupero stato:', error);
    }
    
    return null;
  }
  
  getActiveBots(): string[] {
    return Array.from(this.bots.keys());
  }
  
  async stopAllBots(): Promise<void> {
    const promises = Array.from(this.bots.keys()).map(userId => this.stopBot(userId));
    await Promise.all(promises);
  }
}

// Esporta istanza singleton del manager
export const whatsappManager = new WhatsAppManager();

// Gestione graceful shutdown globale
process.on('SIGINT', async () => {
  console.log('\n🛑 Arresto tutti i bot WhatsApp...');
  await whatsappManager.stopAllBots();
  process.exit(0);
});
