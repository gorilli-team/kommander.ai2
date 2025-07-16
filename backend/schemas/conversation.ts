import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const MessageSourceSchema = z.object({
  type: z.enum(['faq', 'document', 'learned', 'contextual']),
  title: z.string(),
  relevance: z.number().min(0).max(1),
  content: z.string().optional(),
  metadata: z.object({
    fileName: z.string().optional(),
    pageNumber: z.number().optional(),
    section: z.string().optional(),
    faqId: z.string().optional(),
    // Metadati per risposte apprese
    reviewedResponseId: z.string().optional(),
    confidence: z.number().optional(),
    matchType: z.enum(['embedding', 'keyword', 'hash', 'hybrid']).optional(),
    usageCount: z.number().optional(),
    // Metadati generali
    hasLinks: z.boolean().optional(),
    approvedBy: z.string().optional(),
    approvalTimestamp: z.date().optional(),
  }).optional(),
});

export const ConversationMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'agent', 'system']),
  content: z.string(),
  timestamp: z.date(),
  sources: z.array(MessageSourceSchema).optional(),
  isRetry: z.boolean().optional(),
  // Campi per la revisione delle risposte
  originalContent: z.string().optional(), // Contenuto originale prima della revisione
  isRevised: z.boolean().optional().default(false), // Indica se la risposta è stata revisionata
  revisedBy: z.string().optional(), // ID dell'operatore che ha fatto la revisione
  revisionTimestamp: z.date().optional(), // Timestamp della revisione
  revisionReason: z.string().optional(), // Motivo della revisione
  
  // Nuovi campi per il sistema di apprendimento AI
  questionHash: z.string().optional(), // Hash della domanda per ricerca veloce
  questionEmbedding: z.array(z.number()).optional(), // Embedding vettoriale per similarity
  approvalStatus: z.enum(['pending', 'approved', 'rejected']).optional().default('pending'),
  usageCount: z.number().optional().default(0), // Quante volte è stata usata questa risposta
  effectiveness: z.number().optional().default(0), // Score di efficacia (0-1)
  isLearnedResponse: z.boolean().optional().default(false), // Se è una risposta appresa
  reviewedResponseId: z.string().optional(), // Link alla risposta nella knowledge base
  
  metadata: z.object({
    processingTime: z.number().optional(),
    model: z.string().optional(),
    tokenCount: z.number().optional(),
    // Nuovi metadati per tracking
    similarityScore: z.number().optional(), // Score di similarità se risposta appresa
    matchedQuestionId: z.string().optional(), // ID della domanda che ha fatto match
    revisionQuality: z.number().optional(), // Valutazione qualità revisione
  }).optional(),
});

export const ConversationAnalyticsSchema = z.object({
  avgResponseTime: z.number(),
  sourceTypes: z.object({
    faq: z.number(),
    document: z.number(),
  }),
  popularTopics: z.array(z.string()),
});

export const ConversationSchema = z.object({
  _id: z
    .custom<ObjectId>((val) => typeof val === 'object' || ObjectId.isValid(val as string))
    .optional(),
  userId: z.string(),
  title: z.string(),
  messages: z.array(ConversationMessageSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.object({
    totalMessages: z.number(),
    lastActivity: z.date(),
    isArchived: z.boolean().default(false),
    tags: z.array(z.string()).optional(),
    rating: z.number().min(1).max(5).optional(),
    summary: z.string().optional(),
  }),
  analytics: ConversationAnalyticsSchema.optional(),
  // Legacy fields for backward compatibility
  conversationId: z.string().optional(),
  site: z.string().optional(),
  handledBy: z.enum(['bot', 'agent']).default('bot').optional(),
  // Widget-specific field for end user identification
  endUserId: z.string().optional(),
});

export const ConversationSummarySchema = z.object({
  _id: z.custom<ObjectId>(),
  userId: z.string(),
  title: z.string(),
  lastMessage: z.string(),
  lastActivity: z.date(),
  messageCount: z.number(),
  isArchived: z.boolean(),
  tags: z.array(z.string()).optional(),
  rating: z.number().min(1).max(5).optional(),
});

export type MessageSource = z.infer<typeof MessageSourceSchema>;
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;
export type ConversationAnalytics = z.infer<typeof ConversationAnalyticsSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type ConversationSummary = z.infer<typeof ConversationSummarySchema>;

// Legacy type for backward compatibility
export type ConversationDocument = Conversation;
