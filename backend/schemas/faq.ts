
import { z } from 'zod';

export const FaqSchema = z.object({
id: z.string().optional(), // Optional for creation, present for update/display
userId: z.string().optional(), // Added to associate FAQ with a user, optional if organizationId is present
organizationId: z.string().optional(), // Added to associate FAQ with an organization, optional if userId is present
question: z.string().min(1, { message: 'Question is required.' }).max(500, { message: 'Question must be 500 characters or less.' }),
  answer: z.string().min(1, { message: 'Answer is required.' }).max(5000, { message: 'Answer must be 5000 characters or less.' }),
  embedding: z.array(z.number()).optional(), // Vector embedding for semantic search
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Faq = z.infer<typeof FaqSchema>;
