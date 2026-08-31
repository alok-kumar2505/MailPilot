import { Queue } from 'bullmq';
import { redis } from '../config/redis';

export const emailQueue = new Queue('email-send', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});
