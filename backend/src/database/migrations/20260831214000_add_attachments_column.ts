import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('email_batches', (table) => {
    table.jsonb('attachments').nullable();
  });

  await knex.schema.alterTable('email_jobs', (table) => {
    table.jsonb('attachments').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('email_jobs', (table) => {
    table.dropColumn('attachments');
  });

  await knex.schema.alterTable('email_batches', (table) => {
    table.dropColumn('attachments');
  });
}
