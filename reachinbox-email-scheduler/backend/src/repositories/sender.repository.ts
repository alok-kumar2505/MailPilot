import { db } from '../config/database';

export class SenderRepository {
  async findById(id: string) {
    return db('senders').where({ id }).first();
  }

  async findByUserId(user_id: string) {
    return db('senders').where({ user_id });
  }

  async create(sender: Partial<any>) {
    const [created] = await db('senders').insert(sender).returning('*');
    return created;
  }
}

export const senderRepository = new SenderRepository();
