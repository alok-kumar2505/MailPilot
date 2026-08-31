import { Client } from '@elastic/elasticsearch';
import { env } from './env';

export const elasticClient = new Client({
  node: env.ELASTICSEARCH_URL,
  auth: {
    apiKey: env.ELASTICSEARCH_API_KEY,
  },
});
