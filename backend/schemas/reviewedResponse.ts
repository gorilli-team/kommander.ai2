import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const ReviewedResponseSchema = z.object({
  _id: z.custom<ObjectId>((val) => typeof val === 'object' || ObjectId.isValid(val as string)).optional(),
  userId: z.string(), // Proprietario della knowledge base
  
  // Contenuto principale
  originalQuestion: z.string(), // Domanda originale dell'utente
  originalAnswer: z.string(), // Risposta originale AI
  revisedAnswer: z.string(), // Risposta corretta dall'operatore
  
  // Metadati per il matching intelligente
  questionEmbedding: z.array(z.number()).optional(), // Embedding vettoriale della domanda
  keywords: z.array(z.string()).default([]), // Parole chiave estratte automaticamente
  questionHash: z.string(), // Hash della domanda per ricerca veloce
  
  // Informazioni sulla revisione
  revisedBy: z.string(), // ID dell'operatore che ha fatto la revisione
  revisionReason: z.string().optional(), // Motivo della revisione
  revisionTimestamp: z.date(), // Quando è stata fatta la revisione
  
  // Controllo qualità e approvazione
  approvalStatus: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  approvedBy: z.string().optional(), // ID di chi ha approvato
  approvalTimestamp: z.date().optional(), // Quando è stata approvata
  qualityScore: z.number().min(0).max(1).optional(), // Score qualità (0-1)
  
  // Statistiche di utilizzo
  usageCount: z.number().default(0), // Quante volte è stata usata
  lastUsed: z.date().optional(), // Ultima volta usata
  effectiveness: z.number().default(0), // Score di efficacia (0-1)
  userFeedback: z.array(z.object({
    rating: z.number().min(1).max(5),
    comment: z.string().optional(),
    timestamp: z.date(),
    userId: z.string().optional(),
  })).default([]),
  
  // Categorizzazione e organizzazione
  category: z.string().optional(), // Categoria automatica o manuale
  tags: z.array(z.string()).default([]), // Tags per organizzazione
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  confidence: z.number().min(0).max(1).optional(), // Confidenza nella risposta
  
  // Metadata di sistema
  createdAt: z.date(),
  updatedAt: z.date(),
  isActive: z.boolean().default(true), // Se è attiva per matching
  version: z.number().default(1), // Versioning delle revisioni
  
  // Collegamento alla conversazione originale
  conversationId: z.string().optional(),
  messageId: z.string().optional(),
  
  // Informazioni di contesto
  context: z.object({
    userAgent: z.string().optional(),
    timestamp: z.date().optional(),
    sessionId: z.string().optional(),
    previousQuestions: z.array(z.string()).optional(),
  }).optional(),
  
  // Similarity matching settings
  matchingSettings: z.object({
    similarityThreshold: z.number().min(0).max(1).default(0.8),
    keywordWeight: z.number().min(0).max(1).default(0.3),
    embeddingWeight: z.number().min(0).max(1).default(0.7),
    exactMatchRequired: z.boolean().default(false),
  }).optional(),
});

// Schema per le statistiche di revisione
export const RevisionAnalyticsSchema = z.object({
  totalRevisions: z.number(),
  approvedRevisions: z.number(),
  rejectedRevisions: z.number(),
  pendingRevisions: z.number(),
  averageQualityScore: z.number(),
  averageEffectiveness: z.number(),
  totalUsage: z.number(),
  topCategories: z.array(z.object({
    category: z.string(),
    count: z.number(),
  })),
  topKeywords: z.array(z.object({
    keyword: z.string(),
    frequency: z.number(),
  })),
  revisionTrends: z.array(z.object({
    date: z.date(),
    count: z.number(),
    qualityScore: z.number(),
  })),
});

// Schema per i risultati di matching
export const MatchResultSchema = z.object({
  reviewedResponse: ReviewedResponseSchema,
  similarityScore: z.number().min(0).max(1),
  matchType: z.enum(['embedding', 'keyword', 'hash', 'hybrid']),
  confidence: z.number().min(0).max(1),
  explanation: z.string().optional(),
});

// Schema per le richieste di creazione
export const CreateReviewedResponseSchema = z.object({
  originalQuestion: z.string().min(1),
  originalAnswer: z.string().min(1),
  revisedAnswer: z.string().min(1),
  revisionReason: z.string().optional(),
  conversationId: z.string().optional(),
  messageId: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

// Schema per gli aggiornamenti
export const UpdateReviewedResponseSchema = z.object({
  revisedAnswer: z.string().optional(),
  revisionReason: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  isActive: z.boolean().optional(),
  matchingSettings: z.object({
    similarityThreshold: z.number().min(0).max(1).optional(),
    keywordWeight: z.number().min(0).max(1).optional(),
    embeddingWeight: z.number().min(0).max(1).optional(),
    exactMatchRequired: z.boolean().optional(),
  }).optional(),
});

// Types
export type ReviewedResponse = z.infer<typeof ReviewedResponseSchema>;
export type RevisionAnalytics = z.infer<typeof RevisionAnalyticsSchema>;
export type MatchResult = z.infer<typeof MatchResultSchema>;
export type CreateReviewedResponseRequest = z.infer<typeof CreateReviewedResponseSchema>;
export type UpdateReviewedResponseRequest = z.infer<typeof UpdateReviewedResponseSchema>;
