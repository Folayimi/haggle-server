import { pgTable, text, timestamp, integer, serial } from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users_table', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  age: integer('age').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().$onUpdate(() => new Date()),
})

export const postsTable = pgTable('posts_table', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  content: text('content').notNull(),
  price: integer('price').notNull(),
  userId: integer('user_id').notNull().references(() => usersTable.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().$onUpdate(() => new Date()),
})


export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

export type InsertPost = typeof postsTable.$inferInsert;
export type SelectPost = typeof postsTable.$inferSelect;