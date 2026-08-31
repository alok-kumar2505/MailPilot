import { Worker, Job, DelayedError } from 'bullmq';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { emailRepository } from '../repositories/email.repository';
import { senderRepository } from '../repositories/sender.repository';
import { emailSender } from '../integrations/smtp/email.sender';

const emailWorker = new Worker(
  'email-send',
  async (job: Job) => {
    const { emailJobId } = job.data;
    console.log(`[Worker] Picked up BullMQ Job ID: ${job.id} for EmailJob ID: ${emailJobId}`);

    // 1. IDEMPOTENCY: Atomically claim the job. If 0 rows affected, it's already sent or processing elsewhere.
    const claimedJob = await emailRepository.claimJobForProcessing(emailJobId);
    if (!claimedJob) {
      console.log(`[Worker] Job ${emailJobId} could not be claimed. Already processed or invalid state. Skipping.`);
      return;
    }

    const senderId = claimedJob.sender_id || 'default';

    // 2. RATE LIMITING: Check Redis atomic counters per sender per hour window
    const currentHour = new Date().toISOString().slice(0, 13); // e.g. "2026-09-01T10"
    const rateKey = `email-rate:${senderId}:${currentHour}`;
    const count = await redis.incr(rateKey);
    
    if (count === 1) {
      await redis.expire(rateKey, 3600); // Expire after 1 hour
    }

    if (count > env.MAX_EMAILS_PER_HOUR) {
      console.log(`[Worker] Rate limit exceeded for sender ${senderId}. Rescheduling to next hour.`);
      
      // Calculate next available hour start time
      const now = new Date();
      const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
      
      // Offset by a few seconds based on the job index or randomness to prevent all bursting at exactly 00:00
      nextHour.setSeconds(Math.floor(Math.random() * 30));

      // Reschedule in PostgreSQL
      await emailRepository.rescheduleJob(emailJobId, nextHour);

      // Tell BullMQ to move this job to delayed state (requires BullMQ 4+)
      await job.moveToDelayed(nextHour.getTime(), job.token!);
      throw new DelayedError();
    }

    // 3. FETCH SENDER CREDENTIALS
    let senderCredentials;
    if (claimedJob.sender_id) {
      const sender = await senderRepository.findById(claimedJob.sender_id);
      if (sender) {
        senderCredentials = {
          email: sender.email,
          user: sender.ethereal_user,
          pass: sender.ethereal_password,
        };
      }
    }

    try {
      // 4. SEND EMAIL VIA SMTP
      console.log(`[Worker] Sending email to ${claimedJob.recipient} via SMTP...`);
      const result = await emailSender.sendEmail(
        claimedJob.recipient,
        claimedJob.subject,
        claimedJob.body,
        senderCredentials
      );

      // 5. SUCCESS: Mark as SENT in PostgreSQL
      await emailRepository.updateJobStatus(emailJobId, {
        status: 'SENT',
        sent_at: new Date(),
        message_id: result.messageId,
        preview_url: result.previewUrl,
      });

      console.log(`[Worker] Successfully sent email to ${claimedJob.recipient}. Preview: ${result.previewUrl}`);
    } catch (error: any) {
      console.error(`[Worker] Failed to send email to ${claimedJob.recipient}:`, error.message);
      
      // If we've exhausted our max attempts (configured in queue as 3)
      if (job.attemptsMade >= 2) {
        await emailRepository.updateJobStatus(emailJobId, {
          status: 'FAILED',
          last_error: error.message,
        });
        console.log(`[Worker] Exhausted retries for ${emailJobId}. Marked as FAILED.`);
      } else {
        // Just record the error and revert to SCHEDULED for the next retry
        await emailRepository.updateJobStatus(emailJobId, {
          status: 'SCHEDULED', // Revert so claimJobForProcessing works on next attempt
          last_error: error.message,
        });
      }

      throw error; // Let BullMQ handle the backoff and retry mechanism
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
