import { db } from '../../db/db';

export abstract class BaseRepository {
  protected database = db;

  protected async handleError(error: unknown, context: string) {
    console.error(`[${context}] Error:`, error);
    throw new Error(`Database error: ${context}`);
  }
}
