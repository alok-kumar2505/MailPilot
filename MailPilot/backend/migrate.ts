import { db } from './src/config/database';

async function migrate() {
  try {
    console.log('Running migrations...');
    await db.raw(`ALTER TABLE email_jobs ADD COLUMN is_favourited BOOLEAN DEFAULT FALSE NOT NULL;`);
    console.log('Migrations finished.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

migrate();
