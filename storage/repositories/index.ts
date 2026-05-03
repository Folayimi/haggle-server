import { UsersRepository } from './users.repository';
import { ItemsRepository } from './items.repository';

// Create singleton instances
export const usersRepository = new UsersRepository();
export const itemsRepository = new ItemsRepository();

// Export repositories
export * from './users.repository';
export * from './items.repository';
