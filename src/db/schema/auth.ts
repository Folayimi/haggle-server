/**
 * Authentication & Identity Schema
 *
 * Core tables for:
 * - User account creation and status
 * - Multiple authentication methods (phone, email, OAuth)
 * - One-Time Passwords for verification and login
 * - Session management and device tracking
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
  index,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  AuthProvider,
  EmailVerificationType,
  OTPChannel,
  OTPPurpose,
  UserPrimaryRole,
  UserStatus,
  enumValues,
} from "./enums";

/**
 * USERS TABLE
 * Root account record used by every other table in the system.
 * Stores basic user status and role information.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    primary_role: text("primary_role", {
      enum: enumValues(UserPrimaryRole),
    })
      .notNull()
      .default(UserPrimaryRole.BUYER),
    status: text("status", {
      enum: enumValues(UserStatus),
    })
      .notNull()
      .default(UserStatus.ACTIVE),
    last_active_at: timestamp("last_active_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    statusIdx: index("users_status_idx").on(table.status),
    roleIdx: index("users_role_idx").on(table.primary_role),
  }),
);

/**
 * AUTH_IDENTITIES TABLE
 * Supports phone login, email login, and OAuth without polluting users table.
 * Users can have multiple identities (e.g., phone + email + Google).
 */
export const authIdentities = pgTable(
  "auth_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider", {
      enum: enumValues(AuthProvider),
    }).notNull(),
    provider_uid: text("provider_uid").notNull(),
    email: text("email"),
    phone_e164: text("phone_e164"), // Phone in E.164 format: +1234567890
    password_hash: text("password_hash"),
    is_primary: boolean("is_primary").notNull().default(false),
    verified_at: timestamp("verified_at", { withTimezone: true }),
    last_used_at: timestamp("last_used_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("auth_identities_user_id_idx").on(table.user_id),
    providerUidUnique: uniqueIndex("auth_identities_provider_uid_unique").on(
      table.provider,
      table.provider_uid,
    ),
    emailUnique: uniqueIndex("auth_identities_email_unique")
      .on(table.email)
      .where(
        // Only enforce uniqueness for non-null emails
        sql`"email" IS NOT NULL`,
      ),
    // phoneUnique: uniqueIndex("auth_identities_phone_unique")
    //   .on(table.phone_e164)
    //   .where(
    //     // Only enforce uniqueness for non-null phone numbers
    //     sql`"phone_e164" IS NOT NULL`,
    //   ),
  }),
);

/**
 * AUTH_OTPS TABLE
 * One-Time Passwords for:
 * - Phone/email verification during signup
 * - Login challenges
 * - Password reset flows
 */
export const authOtps = pgTable(
  "auth_otps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    channel: text("channel", {
      enum: enumValues(OTPChannel),
    }).notNull(),
    purpose: text("purpose", {
      enum: enumValues(OTPPurpose),
    }).notNull(),
    target: text("target").notNull(), // Phone number or email address
    code_hash: text("code_hash").notNull(), // Hashed code for security
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumed_at: timestamp("consumed_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index("auth_otps_user_id_idx").on(table.user_id),
    targetIdx: index("auth_otps_target_idx").on(table.target),
    expiresAtIdx: index("auth_otps_expires_at_idx").on(table.expires_at),
  }),
);

/**
 * EMAIL_VERIFICATIONS TABLE
 * Supports web link verification and app OTP verification.
 */
export const emailVerifications = pgTable(
  "email_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    token: text("token"),
    otp_code: text("otp_code"),
    type: text("type", {
      enum: enumValues(EmailVerificationType),
    }).notNull(),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    verified_at: timestamp("verified_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index("email_verifications_user_id_idx").on(table.user_id),
    emailIdx: index("email_verifications_email_idx").on(table.email),
    tokenIdx: index("email_verifications_token_idx").on(table.token),
    otpCodeIdx: index("email_verifications_otp_code_idx").on(table.otp_code),
    expiresAtIdx: index("email_verifications_expires_at_idx").on(
      table.expires_at,
    ),
  }),
);

export const resetEmailVerifications = pgTable(
  "reset_email_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    token: text("token"),
    otp_code: text("otp_code"),
    type: text("type", {
      enum: enumValues(EmailVerificationType),
    }).notNull(),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    verified_at: timestamp("verified_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index("reset_email_verifications_user_id_idx").on(table.user_id),
    emailIdx: index("reset_email_verifications_email_idx").on(table.email),
    tokenIdx: index("reset_email_verifications_token_idx").on(table.token),
    otpCodeIdx: index("reset_email_verifications_otp_code_idx").on(
      table.otp_code,
    ),
    expiresAtIdx: index("reset_email_verifications_expires_at_idx").on(
      table.expires_at,
    ),
  }),
);

/**
 * USER_SESSIONS TABLE
 * Manages user sessions for:
 * - Refresh token storage
 * - Device and platform tracking
 * - Session revocation and logout everywhere
 * - Suspicious session detection
 */
export const userSessions = pgTable(
  "user_sessions",
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
    userIdIdx: index("user_sessions_user_id_idx").on(table.user_id),
    refreshTokenIdx: index("user_sessions_refresh_token_idx").on(
      table.refresh_token,
    ),
    expiresAtIdx: index("user_sessions_expires_at_idx").on(table.expires_at),
  }),
);

// Type inference for INSERT and SELECT operations
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

export type InsertAuthIdentity = typeof authIdentities.$inferInsert;
export type SelectAuthIdentity = typeof authIdentities.$inferSelect;

export type InsertAuthOtp = typeof authOtps.$inferInsert;
export type SelectAuthOtp = typeof authOtps.$inferSelect;

export type InsertEmailVerification = typeof emailVerifications.$inferInsert;
export type SelectEmailVerification = typeof emailVerifications.$inferSelect;

export type InsertResetEmailVerification =
  typeof resetEmailVerifications.$inferInsert;
export type SelectResetEmailVerification =
  typeof resetEmailVerifications.$inferSelect;

export type InsertUserSession = typeof userSessions.$inferInsert;
export type SelectUserSession = typeof userSessions.$inferSelect;
