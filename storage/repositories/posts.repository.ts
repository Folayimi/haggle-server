import { BaseRepository } from "./base.repository";
import { postsTable } from "../../src/schema";
import { eq } from "drizzle-orm";

export interface CreatePostInput {
  title: string;
  description: string;
  content: string;
  price: number;
  userId: number;
}

export interface Post {
  id: number;
  title: string;
  description: string | null;
  content: string | null;
  price: number | null;
  userId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class PostsRepository extends BaseRepository {
  async findAll(): Promise<Post[]> {
    try {
      return await this.database.select().from(postsTable);
    } catch (error) {
      this.handleError(error, "ItemsRepository.findAll");
      throw error;
    }
  }

  async findById(id: number): Promise<Post | null> {
    try {
      const result = await this.database
        .select()
        .from(postsTable)
        .where(eq(postsTable.id, id));

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      this.handleError(error, "ItemsRepository.findById");
      throw error;
    }
  }

  async findByUserId(userId: number): Promise<Post[]> {
    try {
      return await this.database
        .select()
        .from(postsTable)
        .where(eq(postsTable.userId, userId));
    } catch (error) {
      this.handleError(error, "ItemsRepository.findByUserId");
      throw error;
    }
  }

  async create(data: CreatePostInput): Promise<Post> {
    try {
      const result = await this.database
        .insert(postsTable)
        .values(data)
        .returning();

      return result[0];
    } catch (error) {
      this.handleError(error, "ItemsRepository.create");
      throw error;
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const result = await this.database
        .delete(postsTable)
        .where(eq(postsTable.id, id));

      return result.rowCount > 0;
    } catch (error) {
      this.handleError(error, "ItemsRepository.delete");
      throw error;
    }
  }

  async deleteByUserId(userId: number): Promise<boolean> {
    try {
      const result = await this.database
        .delete(postsTable)
        .where(eq(postsTable.userId, userId));

      return result.rowCount > 0;
    } catch (error) {
      this.handleError(error, "ItemsRepository.deleteByUserId");
      throw error;
    }
  }
}
