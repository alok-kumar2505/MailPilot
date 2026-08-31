import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import healthRouter from './routes/health';
import authRouter from './routes/auth.routes';
import emailRouter from './routes/email.routes';
import slackRouter from './routes/slack.routes';
import { errorHandler } from './middleware/error';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { emailQueue } from './queues/email.queue';
import { authMiddleware } from './middleware/auth.middleware';

const app = express();
app.set('trust proxy', 1);

// Bull Board setup
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter: serverAdapter,
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Public Routes
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);

// Protected Routes
app.use('/api/emails', authMiddleware, emailRouter);
app.use('/api/slack', authMiddleware, slackRouter);

// Bull Board Route (admin access only in production)
app.use('/admin/queues', serverAdapter.getRouter());

// Error handling
app.use(errorHandler);

export default app;
