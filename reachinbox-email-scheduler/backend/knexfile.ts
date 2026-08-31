import type { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables for the knex CLI
dotenv.config({ path: path.resolve(__dirname, '.env') });

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    },
    migrations: {
      directory: './src/database/migrations',
      extension: 'ts',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    },
    migrations: {
      directory: './src/database/migrations',
      extension: 'js',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};

export default config;
