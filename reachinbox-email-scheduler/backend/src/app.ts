import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import healthRouter from './routes/health';
import emailRouter from './routes/email.routes';
import { errorHandler } from './middleware/error';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use('/api', healthRouter);
app.use('/api/emails', emailRouter);

// Error handling
app.use(errorHandler);

export default app;
