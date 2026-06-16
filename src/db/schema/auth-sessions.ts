import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { users, resetEmailVerifications } from "./auth";

/**
 * AUTH_SESSIONS TABLE
 * Stores refresh tokens and authentication sessions
 */
export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    refresh_token: text("refresh_token").notNull().unique(),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    revoked_at: timestamp("revoked_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("auth_sessions_user_id_idx").on(table.user_id),
    refreshTokenIdx: index("auth_sessions_refresh_token_idx").on(
      table.refresh_token,
    ),
    expiresAtIdx: index("auth_sessions_expires_at_idx").on(table.expires_at),
  }),
);


// Type inference
export type InsertAuthSession = typeof authSessions.$inferInsert;
export type SelectAuthSession = typeof authSessions.$inferSelect;
