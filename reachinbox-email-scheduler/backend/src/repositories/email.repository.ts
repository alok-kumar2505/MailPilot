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

  async findJobsByStatus(
    statuses: string[],
    page: number = 1,
    limit: number = 20
  ) {
    const offset = (page - 1) * limit;

    const [countResult] = await db('email_jobs')
      .whereIn('status', statuses)
      .count('* as total');

    const total = Number(countResult.total);

    const jobs = await db('email_jobs')
      .whereIn('status', statuses)
      .orderBy('scheduled_at', 'asc')
      .limit(limit)
      .offset(offset);

    return {
      data: jobs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
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
}

export const emailRepository = new EmailRepository();
