import { BaseRepository } from './base.repository';
import { items } from '../../db/schema';
import { eq } from 'drizzle-orm';

export interface CreateItemInput {
  title: string;
  description?: string;
  userId: number;
}

export interface Item {
  id: number;
  title: string;
  description: string | null;
  userId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class ItemsRepository extends BaseRepository {
  async findAll(): Promise<Item[]> {
    try {
      return await this.database.select().from(items);
    } catch (error) {
      this.handleError(error, 'ItemsRepository.findAll');
      throw error;
    }
  }

  async findById(id: number): Promise<Item | null> {
    try {
      const result = await this.database
        .select()
        .from(items)
        .where(eq(items.id, id));

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      this.handleError(error, 'ItemsRepository.findById');
      throw error;
    }
  }

  async findByUserId(userId: number): Promise<Item[]> {
    try {
      return await this.database
        .select()
        .from(items)
        .where(eq(items.userId, userId));
    } catch (error) {
      this.handleError(error, 'ItemsRepository.findByUserId');
      throw error;
    }
  }

  async create(data: CreateItemInput): Promise<Item> {
    try {
      const result = await this.database
        .insert(items)
        .values(data)
        .returning();

      return result[0];
    } catch (error) {
      this.handleError(error, 'ItemsRepository.create');
      throw error;
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const result = await this.database
        .delete(items)
        .where(eq(items.id, id));

      return result.rowCount > 0;
    } catch (error) {
      this.handleError(error, 'ItemsRepository.delete');
      throw error;
    }
  }

  async deleteByUserId(userId: number): Promise<boolean> {
    try {
      const result = await this.database
        .delete(items)
        .where(eq(items.userId, userId));

      return result.rowCount > 0;
    } catch (error) {
      this.handleError(error, 'ItemsRepository.deleteByUserId');
      throw error;
    }
  }
}
