import { Router, Request, Response } from 'express';
import { db } from '../config/database';
import { redis } from '../config/redis';
import { elasticClient } from '../config/elasticsearch';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  const healthStatus: any = {
    api: 'ok',
    timestamp: new Date().toISOString(),
    services: {},
  };

  // Check PostgreSQL
  try {
    await db.raw('SELECT 1');
    healthStatus.services.postgresql = 'ok';
  } catch (error: any) {
    healthStatus.services.postgresql = 'error';
    healthStatus.services.postgresqlError = error.message;
    healthStatus.api = 'error';
  }

  // Check Redis
  try {
    const ping = await redis.ping();
    healthStatus.services.redis = ping === 'PONG' ? 'ok' : 'error';
  } catch (error: any) {
    healthStatus.services.redis = 'error';
    healthStatus.services.redisError = error.message;
    healthStatus.api = 'error';
  }

  // Check Elasticsearch
  try {
    const esHealth = await elasticClient.cluster.health();
    healthStatus.services.elasticsearch = esHealth.status;
  } catch (error: any) {
    healthStatus.services.elasticsearch = 'error';
    healthStatus.services.elasticsearchError = error.message;
    healthStatus.api = 'error';
  }

  const statusCode = healthStatus.api === 'ok' ? 200 : 503;
  res.status(statusCode).json(healthStatus);
});

export default router;
