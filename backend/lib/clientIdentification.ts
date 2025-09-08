import { connectToDatabase } from './mongodb';
import { ObjectId } from 'mongodb';

export interface ClientInfo {
  userId: string;
  clientEmail?: string;
  companyName?: string;
  sector?: string;
  planType?: string;
  botCount?: number;
}

/**
 * Estrae informazioni del cliente da userId, email o altre identificazioni
 */
export async function getClientInfo(identifier: string): Promise<ClientInfo> {
  try {
    const { db } = await connectToDatabase();
    
    // Prima cerca per userId diretto
    let user = null;
    
    // Se l'identifier sembra un ObjectId, cerca per _id
    if (ObjectId.isValid(identifier)) {
      user = await db.collection('users').findOne({ _id: new ObjectId(identifier) });
    }
    
    // Se non trovato, cerca per email
    if (!user && identifier.includes('@')) {
      user = await db.collection('users').findOne({ email: identifier });
    }
    
    // Se non trovato, cerca per userId string
    if (!user) {
      user = await db.collection('users').findOne({ userId: identifier });
    }
    
    // Se ancora non trovato, cerca nelle impostazioni utente
    if (!user) {
      const settings = await db.collection('user_settings').findOne({ userId: identifier });
      if (settings) {
        user = await db.collection('users').findOne({ _id: new ObjectId(settings.userId) });
      }
    }
    
    if (!user) {
      console.warn(`[ClientIdentification] Cliente non trovato per identifier: ${identifier}`);
      return {
        userId: identifier,
        clientEmail: identifier.includes('@') ? identifier : undefined
      };
    }
    
    // Estrai informazioni dal documento utente
    const clientInfo: ClientInfo = {
      userId: user._id?.toString() || identifier,
      clientEmail: user.email || (identifier.includes('@') ? identifier : undefined),
      companyName: user.company || user.companyName || extractCompanyFromEmail(user.email),
      sector: user.sector || user.industry || 'multi-settore',
      planType: user.planType || user.subscription?.plan || 'starter',
      botCount: user.botCount || user.chatbotCount || 1
    };
    
    return clientInfo;
    
  } catch (error) {
    console.error('[ClientIdentification] Errore nel recupero info cliente:', error);
    return {
      userId: identifier,
      clientEmail: identifier.includes('@') ? identifier : undefined
    };
  }
}

/**
 * Estrae il nome dell'azienda dall'email (euristica semplice)
 */
function extractCompanyFromEmail(email?: string): string | undefined {
  if (!email || !email.includes('@')) return undefined;
  
  const domain = email.split('@')[1];
  if (!domain) return undefined;
  
  // Rimuovi domini comuni di email personali
  const personalDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
    'icloud.com', 'libero.it', 'virgilio.it', 'tiscali.it'
  ];
  
  if (personalDomains.includes(domain.toLowerCase())) {
    return undefined;
  }
  
  // Estrai nome azienda dal dominio
  const parts = domain.split('.');
  if (parts.length >= 2) {
    const companyPart = parts[0];
    // Capitalizza prima lettera
    return companyPart.charAt(0).toUpperCase() + companyPart.slice(1);
  }
  
  return domain;
}

/**
 * Aggiorna le informazioni cliente nel database
 */
export async function updateClientInfo(userId: string, updates: Partial<ClientInfo>): Promise<void> {
  try {
    const { db } = await connectToDatabase();
    
    const updateDoc: any = {};
    if (updates.companyName) updateDoc.companyName = updates.companyName;
    if (updates.sector) updateDoc.sector = updates.sector;
    if (updates.planType) updateDoc.planType = updates.planType;
    if (updates.botCount) updateDoc.botCount = updates.botCount;
    
    if (Object.keys(updateDoc).length > 0) {
      await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $set: updateDoc },
        { upsert: false }
      );
      
      console.log(`[ClientIdentification] Aggiornate info cliente per ${userId}:`, updateDoc);
    }
    
  } catch (error) {
    console.error('[ClientIdentification] Errore aggiornamento info cliente:', error);
  }
}

/**
 * Determina il piano enterprise suggerito basato sull'utilizzo
 */
export function suggestEnterprisePlan(monthlyApiCost: number, botCount: number = 1): string {
  // Logica basata sui costi API e numero bot
  if (monthlyApiCost > 100 || botCount > 15) {
    return 'Enterprise Plus'; // €4999
  } else if (monthlyApiCost > 50 || botCount > 10) {
    return 'Enterprise'; // €2499
  } else if (monthlyApiCost > 20 || botCount > 5) {
    return 'Business'; // €1299
  } else if (monthlyApiCost > 5 || botCount > 2) {
    return 'Professional'; // €699
  } else {
    return 'Starter'; // €299
  }
}

/**
 * Calcola il risk level per clienti enterprise
 */
export function calculateEnterpriseRiskLevel(monthlyProjection: number, planType?: string): 'low' | 'medium' | 'high' {
  // Per clienti enterprise, le soglie sono più alte
  if (monthlyProjection > 200) {
    return 'high';
  } else if (monthlyProjection > 50) {
    return 'medium';
  } else {
    return 'low';
  }
}
