import { UsersRepository } from "./users.repository";
import { PostsRepository } from "./posts.repository";

// Create singleton instances
export const usersRepository = new UsersRepository();
export const postsRepository = new PostsRepository();

// Export repositories
export * from "./users.repository";
export * from "./posts.repository";
