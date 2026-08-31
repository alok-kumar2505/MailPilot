import { db } from './src/config/database';

async function runMigrations() {
  console.log('Running migrations...');
  try {
    await db.migrate.latest({
      directory: './src/database/migrations'
    });
    console.log('Migrations complete!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await db.destroy();
  }
}

runMigrations();
