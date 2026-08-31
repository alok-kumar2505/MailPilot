import { db } from '../config/database';

export class EmailRepository {
  async createBatchWithJobs(
    batchData: {
      user_id: string;
      subject: string;
      body: string;
      start_time: Date;
      delay_between_ms: number;
      hourly_limit: number;
    },
    jobsData: Array<{
      user_id: string;
      sender_id?: string | null;
      recipient: string;
      subject: string;
      body: string;
      scheduled_at: Date;
      status: string;
    }>
  ) {
    return db.transaction(async (trx) => {
      // 1. Create the batch
      const [batch] = await trx('email_batches').insert(batchData).returning('*');

      // 2. Attach batch_id to jobs
      const jobsToInsert = jobsData.map((job) => ({
        ...job,
        batch_id: batch.id,
      }));

      // 3. Create the jobs
      const jobs = await trx('email_jobs').insert(jobsToInsert).returning('*');

      return { batch, jobs };
    });
  }

  async getStats(userId: string) {
    const scheduled = await db('email_jobs').where({ user_id: userId }).whereIn('status', ['SCHEDULED', 'PROCESSING']).count('id as total').first();
    const sent = await db('email_jobs').where({ user_id: userId }).whereIn('status', ['SENT', 'FAILED']).count('id as total').first();
    
    return {
      scheduled: parseInt(scheduled?.total as string) || 0,
      sent: parseInt(sent?.total as string) || 0,
    };
  }

  async findJobsByUserIdAndStatus(userId: string, statuses: string[], page: number, limit: number, isFavourited?: boolean) {
    const offset = (page - 1) * limit;

    let query = db('email_jobs')
      .where({ user_id: userId })
      .whereIn('status', statuses);

    if (isFavourited) {
      query = query.where({ is_favourited: true });
    }

    const [countResult, jobs] = await Promise.all([
      query.clone().count('id as total').first(),
      query.clone().orderBy('scheduled_at', 'asc').limit(limit).offset(offset),
    ]);

    return {
      data: jobs,
      pagination: {
        total: parseInt(countResult?.total as string) || 0,
        page,
        limit,
      },
    };
  }

  async findJobById(id: string) {
    return db('email_jobs').where({ id }).first();
  }

  async updateJobStatus(id: string, updates: { status: string; sent_at?: Date; last_error?: string; message_id?: string; preview_url?: string; attempts?: number }) {
    const [updated] = await db('email_jobs')
      .where({ id })
      .update({
        ...updates,
        updated_at: new Date(),
      })
      .returning('*');
    return updated;
  }

  async claimJobForProcessing(id: string) {
    const [claimed] = await db('email_jobs')
      .where({ id })
      .whereIn('status', ['SCHEDULED', 'PROCESSING'])
      .update({
        status: 'PROCESSING',
        attempts: db.raw('attempts + 1'),
        updated_at: new Date(),
      })
      .returning('*');
    return claimed || null;
  }

  async rescheduleJob(id: string, newScheduledAt: Date) {
    const [updated] = await db('email_jobs')
      .where({ id })
      .update({
        scheduled_at: newScheduledAt,
        status: 'SCHEDULED',
        updated_at: new Date(),
      })
      .returning('*');
    return updated;
  }

  async toggleFavourite(id: string, is_favourited: boolean) {
    const [updated] = await db('email_jobs')
      .where({ id })
      .update({
        is_favourited,
        updated_at: new Date(),
      })
      .returning('*');
    return updated;
  }
}

export const emailRepository = new EmailRepository();
