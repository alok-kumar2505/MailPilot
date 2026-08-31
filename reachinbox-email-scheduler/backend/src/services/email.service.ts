import { emailRepository } from '../repositories/email.repository';
import { userRepository } from '../repositories/user.repository';
import { senderRepository } from '../repositories/sender.repository';
import { CreateEmailBatchDto } from '../schemas/email.schema';
import { emailQueue } from '../queues/email.queue';
import { env } from '../config/env';
import { esClient } from '../integrations/elasticsearch/es.client';

export class EmailService {
  async ensureDummyUser(): Promise<string> {
    // For Phase 4 (no auth), we use a default user and dummy sender to satisfy foreign keys
    let user = await userRepository.findById('00000000-0000-0000-0000-000000000000');
    if (!user) {
      user = await userRepository.create({
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Test User',
        email: 'test@example.com',
      });
    }

    let senders = await senderRepository.findByUserId(user.id);
    if (senders.length === 0) {
      await senderRepository.create({
        user_id: user.id,
        email: env.SMTP_USER,
        ethereal_user: env.SMTP_USER,
        ethereal_password: env.SMTP_PASSWORD,
      });
    }

    return user.id;
  }

  async scheduleEmails(data: CreateEmailBatchDto) {
    const userId = await this.ensureDummyUser();
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

      const assignedSender = senders[index % senders.length];

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

  async getScheduledEmails(page: number, limit: number) {
    return emailRepository.findJobsByStatus(['SCHEDULED', 'PROCESSING'], page, limit);
  }

  async getSentEmails(page: number, limit: number) {
    return emailRepository.findJobsByStatus(['SENT', 'FAILED'], page, limit);
  }

  async getEmailJobById(id: string) {
    return emailRepository.findJobById(id);
  }
}

export const emailService = new EmailService();
