import { Worker, Job } from 'bullmq';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { emailRepository } from '../repositories/email.repository';

// Set up the worker
const emailWorker = new Worker(
  'email-send',
  async (job: Job) => {
    const { emailJobId } = job.data;
    console.log(`[Worker] Picked up BullMQ Job ID: ${job.id} for EmailJob ID: ${emailJobId}`);

    // 1. Mark as PROCESSING in PostgreSQL
    await emailRepository.updateJobStatus(emailJobId, {
      status: 'PROCESSING',
      attempts: job.attemptsMade + 1,
    });

    // 2. Fetch the job details (optional, if we need recipient, subject, etc.)
    const emailJob = await emailRepository.findJobById(emailJobId);
    if (!emailJob) {
      throw new Error(`EmailJob ${emailJobId} not found in database!`);
    }

    try {
      // 3. Simulate processing without Ethereal for now
      console.log(`[Worker] Simulating sending email to ${emailJob.recipient}...`);
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate 2s network request

      // Random failure simulation could go here for testing, but let's assume success for now

      // 4. Mark as SENT in PostgreSQL
      await emailRepository.updateJobStatus(emailJobId, {
        status: 'SENT',
        sent_at: new Date(),
        message_id: `simulated-${Date.now()}`,
      });

      console.log(`[Worker] Successfully sent email to ${emailJob.recipient}`);
    } catch (error: any) {
      console.error(`[Worker] Failed to send email to ${emailJob.recipient}:`, error);
      
      // Mark as FAILED in PostgreSQL
      await emailRepository.updateJobStatus(emailJobId, {
        status: 'FAILED',
        last_error: error.message,
      });

      throw error; // Let BullMQ handle retries
    }
  },
  {
    connection: redis,
    concurrency: env.WORKER_CONCURRENCY,
  }
);

emailWorker.on('completed', (job) => {
  console.log(`[Worker] Completed job ${job.id} successfully`);
});

emailWorker.on('failed', (job, err) => {
  console.log(`[Worker] Job ${job?.id} failed with error ${err.message}`);
});

console.log(`[Worker] Started listening to 'email-send' queue with concurrency ${env.WORKER_CONCURRENCY}`);
