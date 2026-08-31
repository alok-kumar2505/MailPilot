import { Router, Request, Response } from 'express';
import { db } from '../config/database';
import { redis } from '../config/redis';
import { elasticClient } from '../config/elasticsearch';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  const health: any = {
    api: 'ok',
    timestamp: new Date().toISOString(),
  };

  try {
    await db.raw('SELECT 1');
    health.database = 'ok';
  } catch (error) {
    health.database = 'error';
  }

  try {
    await redis.ping();
    health.redis = 'ok';
  } catch (error) {
    health.redis = 'error';
  }

  try {
    const esPing = await elasticClient.ping();
    health.elasticsearch = esPing ? 'ok' : 'error';
  } catch (error) {
    health.elasticsearch = 'error';
  }

  const statusCode = Object.values(health).includes('error') ? 503 : 200;
  res.status(statusCode).json(health);
});

export default router;
