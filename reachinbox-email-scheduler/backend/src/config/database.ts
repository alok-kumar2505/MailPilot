import knex from 'knex';
import { env } from './env';

export const db = knex({
  client: 'pg',
  connection: {
    connectionString: env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  },
  pool: {
    min: 2,
    max: 10,
  },
});
