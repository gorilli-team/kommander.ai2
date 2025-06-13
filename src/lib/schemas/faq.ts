import { z } from 'zod';

export const FaqSchema = z.object({
  id: z.string().optional(), // Optional for creation, present for update/display
  question: z.string().min(1, { message: 'Question is required.' }).max(500, { message: 'Question must be 500 characters or less.' }),
  answer: z.string().min(1, { message: 'Answer is required.' }).max(5000, { message: 'Answer must be 5000 characters or less.' }),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Faq = z.infer<typeof FaqSchema>;
