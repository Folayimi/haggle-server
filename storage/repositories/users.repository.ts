import { BaseRepository } from './base.repository';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';

export interface CreateUserInput {
  name: string;
  email: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class UsersRepository extends BaseRepository {
  async findAll(): Promise<User[]> {
    try {
      return await this.database.select().from(users);
    } catch (error) {
      this.handleError(error, 'UsersRepository.findAll');
      throw error;
    }
  }

  async findById(id: number): Promise<User | null> {
    try {
      const result = await this.database
        .select()
        .from(users)
        .where(eq(users.id, id));

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      this.handleError(error, 'UsersRepository.findById');
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await this.database
        .select()
        .from(users)
        .where(eq(users.email, email));

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      this.handleError(error, 'UsersRepository.findByEmail');
      throw error;
    }
  }

  async create(data: CreateUserInput): Promise<User> {
    try {
      const result = await this.database
        .insert(users)
        .values(data)
        .returning();

      return result[0];
    } catch (error) {
      this.handleError(error, 'UsersRepository.create');
      throw error;
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const result = await this.database
        .delete(users)
        .where(eq(users.id, id));

      return result.rowCount > 0;
    } catch (error) {
      this.handleError(error, 'UsersRepository.delete');
      throw error;
    }
  }
}
