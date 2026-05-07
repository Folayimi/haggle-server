import { db } from "../../src/db/db";

export abstract class BaseRepository {
  protected readonly database = db;

  protected pickDefined<T extends Record<string, unknown>>(
    values: T,
  ): Partial<T> {
    return Object.fromEntries(
      Object.entries(values).filter(([, value]) => value !== undefined),
    ) as Partial<T>;
  }

  protected assertFound<T>(
    value: T | null | undefined,
    message: string,
  ): T {
    if (value === null || value === undefined) {
      throw new Error(message);
    }

    return value;
  }
}
