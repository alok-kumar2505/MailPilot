import { db } from '../config/database';

export class SlackRepository {
  async findByUserId(user_id: string) {
    return db('slack_connections').where({ user_id });
  }

  async create(connection: Partial<any>) {
    const [created] = await db('slack_connections').insert(connection).returning('*');
    return created;
  }
}

export const slackRepository = new SlackRepository();
