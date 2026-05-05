import { BaseRepository } from "./base.repository";
import { usersTable } from "../../src/schema";
import { eq } from "drizzle-orm";

export interface CreateUserInput {
  name: string;
  email: string;
  age: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class UsersRepository extends BaseRepository {
  async findAll(): Promise<User[]> {
    try {
      return await this.database.select().from(usersTable);
    } catch (error) {
      this.handleError(error, "UsersRepository.findAll");
      throw error;
    }
  }

  async findById(id: number): Promise<User | null> {
    try {
      const result = await this.database
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, id));

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      this.handleError(error, "UsersRepository.findById");
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await this.database
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email));

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      this.handleError(error, "UsersRepository.findByEmail");
      throw error;
    }
  }

  async create(data: CreateUserInput): Promise<User> {
    try {
      const result = await this.database
        .insert(usersTable)
        .values(data)
        .returning();

      return result[0];
    } catch (error) {
      this.handleError(error, "UsersRepository.create");
      throw error;
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const result = await this.database
        .delete(usersTable)
        .where(eq(usersTable.id, id));

      return result.rowCount > 0;
    } catch (error) {
      this.handleError(error, "UsersRepository.delete");
      throw error;
    }
  }
}
