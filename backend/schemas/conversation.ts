import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const MessageSourceSchema = z.object({
  type: z.enum(['faq', 'document', 'greeting', 'contextual']),
  title: z.string(),
  relevance: z.number().min(0).max(1),
  content: z.string().optional(),
  metadata: z.object({
    fileName: z.string().optional(),
    pageNumber: z.number().optional(),
    section: z.string().optional(),
    faqId: z.string().optional(),
    // New metadata fields for greeting and contextual types
    isGreeting: z.boolean().optional(),
    isStreaming: z.boolean().optional(),
    hasLinks: z.boolean().optional(),
  }).optional(),
});

export const ConversationMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'agent', 'system']),
  content: z.string(),
  timestamp: z.date(),
  sources: z.array(MessageSourceSchema).optional(),
  isRetry: z.boolean().optional(),
  metadata: z.object({
    processingTime: z.number().optional(),
    model: z.string().optional(),
    tokenCount: z.number().optional(),
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
