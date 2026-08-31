import { emailRepository } from '../repositories/email.repository';
import { userRepository } from '../repositories/user.repository';
import { CreateEmailBatchDto } from '../schemas/email.schema';
import { emailQueue } from '../queues/email.queue';

export class EmailService {
  async ensureDummyUser(): Promise<string> {
    // For Phase 2 (no auth), we just use a default user to satisfy foreign keys
    let user = await userRepository.findById('00000000-0000-0000-0000-000000000000');
    if (!user) {
      user = await userRepository.create({
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Test User',
        email: 'test@example.com',
      });
    }
    return user.id;
  }

  async scheduleEmails(data: CreateEmailBatchDto) {
    const userId = await this.ensureDummyUser();
    
    // Parse the initial start time
    const startTime = new Date(data.startTime);
    let currentScheduledTime = startTime.getTime();

    // Prepare jobs
    const jobsData = data.recipients.map((recipient, index) => {
      // Logic for hourly limit can be complex.
      // For now, simple delay calculation: 
      // If we hit hourly limit, we would jump the scheduled time by an hour.
      // E.g., if hourlyLimit is 100, at index 100 we add an hour.
      
      if (index > 0 && index % data.hourlyLimit === 0) {
        // We hit the hourly limit, push the next batch by 1 hour (3600000 ms)
        currentScheduledTime += 60 * 60 * 1000;
      } else if (index > 0) {
        currentScheduledTime += data.delayBetweenMs;
      }

      return {
        user_id: userId,
        recipient,
        subject: data.subject,
        body: data.body,
        scheduled_at: new Date(currentScheduledTime),
        status: 'SCHEDULED',
      };
    });

    // Save batch and jobs to PostgreSQL FIRST
    const result = await emailRepository.createBatchWithJobs(
      {
        user_id: userId,
        subject: data.subject,
        body: data.body,
        start_time: startTime,
        delay_between_ms: data.delayBetweenMs,
        hourly_limit: data.hourlyLimit,
      },
      jobsData
    );

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
