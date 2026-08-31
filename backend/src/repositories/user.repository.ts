import { db } from '../config/database';

export class UserRepository {
  async findById(id: string) {
    return db('users').where({ id }).first();
  }

  async findByEmail(email: string) {
    return db('users').where({ email }).first();
  }

  async create(user: Partial<any>) {
    const [created] = await db('users').insert(user).returning('*');
    return created;
  }
}

export const userRepository = new UserRepository();
