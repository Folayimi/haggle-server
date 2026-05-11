/**
 * User Profiles & Seller Identity Schema
 *
 * Core tables for:
 * - Public user profile information
 * - Seller-specific business information
 * - User addresses for shipping and pickup
 * - User settings and preferences
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  index,
  decimal,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { SellerVerificationStatus } from "./enums";

/**
 * USER_PROFILES TABLE
 * Public profile data used in chat, live rooms, seller profile, and reviews.
 * Every user has exactly one profile record.
 */
export const userProfiles = pgTable(
  "user_profiles",
  {
    user_id: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    full_name: text("full_name").notNull(),
    username: text("username").notNull().unique(),
    avatar_url: text("avatar_url"),
    bio: text("bio"),
    country_code: text("country_code"), // e.g., 'US', 'NG', 'UK'
    city: text("city"),
    response_time_label: text("response_time_label"), // e.g., 'Usually responds in 2 hours'
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    usernameIdx: index("user_profiles_username_idx").on(table.username),
    countryIdx: index("user_profiles_country_code_idx").on(table.country_code),
  }),
);

/**
 * SELLER_PROFILES TABLE
 * Seller-only presentation and business information.
 * Denormalized cached counts for feed performance.
 */
export const sellerProfiles = pgTable(
  "seller_profiles",
  {
    user_id: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    business_name: text("business_name").notNull(),
    trade_mark: text("trade_mark"), // Optional trademark
    cover_image_url: text("cover_image_url"), // Shop banner
    sells_summary: text("sells_summary"), // Brief description of what they sell
    verification_status: text("verification_status", {
      enum: [
        SellerVerificationStatus.UNVERIFIED,
        SellerVerificationStatus.VERIFIED,
        SellerVerificationStatus.SUSPENDED,
      ],
    })
      .notNull()
      .default(SellerVerificationStatus.UNVERIFIED),

    // Cached metrics for feed optimization (denormalized)
    rating_avg: decimal("rating_avg", { precision: 3, scale: 2 }), // 0.00 - 5.00
    rating_count: integer("rating_count").notNull().default(0),
    follower_count: integer("follower_count").notNull().default(0),
    completed_sales_count: integer("completed_sales_count")
      .notNull()
      .default(0),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    verificationStatusIdx: index("seller_profiles_verification_status_idx").on(
      table.verification_status,
    ),
  }),
);

/**
 * USER_ADDRESSES TABLE
 * Shipping addresses for buyers and pickup/warehouse addresses for sellers.
 * Users can have multiple addresses.
 */
export const userAddresses = pgTable(
  "user_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(), // e.g., 'Home', 'Office', 'Warehouse'
    recipient_name: text("recipient_name").notNull(),
    phone_e164: text("phone_e164").notNull(), // Phone in E.164 format
    country: text("country").notNull(),
    state: text("state").notNull(),
    city: text("city").notNull(),
    line_1: text("line_1").notNull(), // Street address
    line_2: text("line_2"), // Apartment, suite, etc.
    postal_code: text("postal_code").notNull(),
    is_default: boolean("is_default").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("user_addresses_user_id_idx").on(table.user_id),
  }),
);

/**
 * USER_SETTINGS TABLE
 * Notification preferences, privacy settings, negotiation preferences.
 * Every user has exactly one settings record.
 */
export const userSettings = pgTable("user_settings", {
  user_id: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  push_enabled: boolean("push_enabled").notNull().default(true),
  sms_enabled: boolean("sms_enabled").notNull().default(true),
  email_enabled: boolean("email_enabled").notNull().default(true),
  show_online_status: boolean("show_online_status").notNull().default(true),
  preferred_currency: text("preferred_currency").notNull().default("USD"), // ISO 4217 code
  preferred_role: text("preferred_role").notNull().default("buyer"), // For dual-role users

  // Seller-specific preferences stored as JSON for flexibility
  seller_preferences: jsonb("seller_preferences"), // e.g., auto-accept threshold

  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Type inference for INSERT and SELECT operations
export type InsertUserProfile = typeof userProfiles.$inferInsert;
export type SelectUserProfile = typeof userProfiles.$inferSelect;

export type InsertSellerProfile = typeof sellerProfiles.$inferInsert;
export type SelectSellerProfile = typeof sellerProfiles.$inferSelect;

export type InsertUserAddress = typeof userAddresses.$inferInsert;
export type SelectUserAddress = typeof userAddresses.$inferSelect;

export type InsertUserSettings = typeof userSettings.$inferInsert;
export type SelectUserSettings = typeof userSettings.$inferSelect;
