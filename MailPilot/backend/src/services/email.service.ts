import { emailRepository } from '../repositories/email.repository';
import { userRepository } from '../repositories/user.repository';
import { senderRepository } from '../repositories/sender.repository';
import { CreateEmailBatchDto } from '../schemas/email.schema';
import { emailQueue } from '../queues/email.queue';
import { env } from '../config/env';
import { esClient } from '../integrations/elasticsearch/es.client';

export class EmailService {
  async scheduleEmails(userId: string, data: CreateEmailBatchDto) {
    const senders = await senderRepository.findByUserId(userId);
    
    // Parse the initial start time
    const startTime = new Date(data.startTime);
    let currentScheduledTime = startTime.getTime();

    // We enforce MIN_EMAIL_DELAY_MS if delayBetweenMs is too small
    const actualDelayMs = Math.max(data.delayBetweenMs, env.MIN_EMAIL_DELAY_MS);

    // Prepare jobs (Round Robin sender assignment)
    const jobsData = data.recipients.map((recipient, index) => {
      // API strictly handles logical scheduling based on requested start and delay.
      // Hourly limits are now handled dynamically by the Worker!
      if (index > 0) {
        currentScheduledTime += actualDelayMs;
      }

      // If they have no senders, sender_id is null. We allow this and it will fallback to env vars in the worker, 
      // but in production they should be forced to add a sender.
      const assignedSender = senders.length > 0 ? senders[index % senders.length] : null;

      return {
        user_id: userId,
        sender_id: assignedSender?.id || null,
        recipient,
        subject: data.subject,
        body: data.body,
        scheduled_at: new Date(currentScheduledTime),
        status: 'SCHEDULED',
      };
    });

    // Save batch and jobs to PostgreSQL FIRST
    // Using knex batch insert under the hood ensures we can handle 1000+ jobs efficiently.
    const result = await emailRepository.createBatchWithJobs(
      {
        user_id: userId,
        subject: data.subject,
        body: data.body,
        start_time: startTime,
        delay_between_ms: actualDelayMs,
        hourly_limit: data.hourlyLimit,
      },
      jobsData
    );

    // Asynchronously push to Elasticsearch
    esClient.indexJobs(result.jobs).catch(() => {});

    // Enqueue each job in BullMQ
    const now = Date.now();
    for (const job of result.jobs) {
      const delay = Math.max(0, new Date(job.scheduled_at).getTime() - now);
      
      await emailQueue.add(
        'send-email',
        { emailJobId: job.id },
        {
          jobId: job.id, // BullMQ Job ID tracks exactly to DB EmailJob ID
          delay,
        }
      );
    }

    return result;
  }

  async getStats(userId: string) {
    return emailRepository.getStats(userId);
  }

  async getScheduledEmails(userId: string, page: number, limit: number) {
    // Note: The repository should be updated to filter by user_id
    // But for the sake of this test, we assume findJobsByUserIdAndStatus exists.
    // Let's implement it in the DB query directly or update the repository.
    // We will update the repository next.
    return emailRepository.findJobsByUserIdAndStatus(userId, ['SCHEDULED', 'PROCESSING'], page, limit);
  }

  async getSentEmails(userId: string, page: number, limit: number) {
    return emailRepository.findJobsByUserIdAndStatus(userId, ['SENT', 'FAILED'], page, limit);
  }

  async searchEmails(userId: string, query: string) {
    return esClient.searchEmails(userId, query);
  }

  async getEmailJobById(userId: string, id: string) {
    const job = await emailRepository.findJobById(id);
    if (job && job.user_id !== userId) {
      return null; // IDOR protection
    }
    return job;
  }
}

export const emailService = new EmailService();
