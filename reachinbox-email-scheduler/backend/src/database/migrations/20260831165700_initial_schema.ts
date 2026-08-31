import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('google_id').nullable();
    table.string('name').notNullable();
    table.string('email').notNullable().unique();
    table.string('avatar_url').nullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('senders', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('email').notNullable();
    table.string('ethereal_user').nullable();
    table.string('ethereal_password').nullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('slack_connections', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('team_id').notNullable();
    table.string('team_name').notNullable();
    table.string('access_token').notNullable();
    table.string('channel_id').notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('email_batches', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('subject').notNullable();
    table.text('body').notNullable();
    table.timestamp('start_time').notNullable();
    table.integer('delay_between_ms').notNullable();
    table.integer('hourly_limit').notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('email_jobs', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('batch_id').notNullable().references('id').inTable('email_batches').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('sender_id').nullable().references('id').inTable('senders').onDelete('SET NULL');
    table.string('recipient').notNullable();
    table.string('subject').notNullable();
    table.text('body').notNullable();
    table.timestamp('scheduled_at').notNullable();
    table.timestamp('sent_at').nullable();
    table.enum('status', ['SCHEDULED', 'PROCESSING', 'SENT', 'FAILED']).defaultTo('SCHEDULED').notNullable();
    table.integer('attempts').defaultTo(0).notNullable();
    table.string('bull_job_id').nullable();
    table.string('message_id').nullable();
    table.string('preview_url').nullable();
    table.text('last_error').nullable();
    table.timestamps(true, true);

    // Indexes
    table.index(['user_id', 'status']);
    table.index('batch_id');
    table.index('sender_id');
    table.index('scheduled_at');
    table.index('status');
    table.index('recipient');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('email_jobs');
  await knex.schema.dropTableIfExists('email_batches');
  await knex.schema.dropTableIfExists('slack_connections');
  await knex.schema.dropTableIfExists('senders');
  await knex.schema.dropTableIfExists('users');
}
