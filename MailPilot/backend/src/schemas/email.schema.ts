import { z } from 'zod';

export const createEmailBatchSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  startTime: z.string().datetime({ message: 'Invalid ISO datetime for startTime' }),
  delayBetweenMs: z.number().int().min(0, 'delayBetweenMs must be >= 0'),
  hourlyLimit: z.number().int().min(1, 'hourlyLimit must be >= 1'),
  recipients: z
    .array(z.string().email('Invalid email format in recipients'))
    .min(1, 'At least one recipient is required'),
});

export type CreateEmailBatchDto = z.infer<typeof createEmailBatchSchema>;
