import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.string().transform(Number).default(5001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  ELASTICSEARCH_URL: z.string().url(),
  ELASTICSEARCH_API_KEY: z.string(),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  JWT_SECRET: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_REDIRECT_URI: z.string().url(),
  SLACK_CLIENT_ID: z.string(),
  SLACK_CLIENT_SECRET: z.string(),
  SLACK_REDIRECT_URI: z.string().url(),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.string().transform(Number),
  SMTP_USER: z.string(),
  SMTP_PASSWORD: z.string(),
  WORKER_CONCURRENCY: z.string().transform(Number).default(5),
  MIN_EMAIL_DELAY_MS: z.string().transform(Number).default(2000),
  MAX_EMAILS_PER_HOUR: z.string().transform(Number).default(200)
});

export const env = envSchema.parse(process.env);
