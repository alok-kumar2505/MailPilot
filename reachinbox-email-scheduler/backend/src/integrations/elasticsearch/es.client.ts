import { elasticClient } from '../../config/elasticsearch';

const INDEX_NAME = 'emails';

export class ElasticsearchClient {
  async indexJobs(jobs: any[]) {
    try {
      const operations = jobs.flatMap(job => [
        { index: { _index: INDEX_NAME, _id: job.id } },
        {
          id: job.id,
          userId: job.user_id,
          recipient: job.recipient,
          subject: job.subject,
          body: job.body,
          status: job.status,
          scheduledAt: job.scheduled_at,
          sentAt: job.sent_at || null,
          createdAt: new Date(),
        }
      ]);

      if (operations.length > 0) {
        await elasticClient.bulk({ refresh: true, operations });
      }
    } catch (error: any) {
      console.error('[Elasticsearch] Failed to index jobs:', error.message);
      // We explicitly do NOT throw here to prevent bringing down the main PG/BullMQ flow
    }
  }

  async updateJobStatus(id: string, status: string, sentAt?: Date) {
    try {
      await elasticClient.update({
        index: INDEX_NAME,
        id,
        doc: {
          status,
          sentAt: sentAt || null,
        }
      });
    } catch (error: any) {
      console.error(`[Elasticsearch] Failed to update job ${id} status:`, error.message);
    }
  }

  async searchEmails(userId: string, query: string) {
    try {
      const result = await elasticClient.search({
        index: INDEX_NAME,
        query: {
          bool: {
            must: [
              { term: { userId } },
              {
                multi_match: {
                  query,
                  fields: ['recipient', 'subject', 'body']
                }
              }
            ]
          }
        }
      });
      return result.hits.hits.map((hit: any) => hit._source);
    } catch (error: any) {
      console.error('[Elasticsearch] Search failed:', error.message);
      return [];
    }
  }
}

export const esClient = new ElasticsearchClient();
