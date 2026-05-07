/**
 * Trust, Safety & Verification Schema
 *
 * Core tables for:
 * - Post-transaction ratings and reviews
 * - Seller KYC and business verification
 * - User reporting and abuse flagging
 * - Block functionality for safety
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  index,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { orders } from "./commerce";
import { listings } from "./catalog";
import { liveSessions } from "./sessions";
import { messages } from "./messaging";
import {
  ReportReason,
  ReportStatus,
  SellerVerificationStatus,
  VerificationStatus,
  VerificationType,
} from "./enums";

/**
 * REVIEWS TABLE
 * Post-transaction buyer/seller ratings.
 * Captures feedback from both sides after deal completion.
 */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    order_id: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    reviewer_user_id: uuid("reviewer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reviewed_user_id: uuid("reviewed_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Rating (1-5 stars)
    rating: integer("rating").notNull(), // 1-5
    comment: text("comment"),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orderReviewerReviewedUnique: uniqueIndex(
      "reviews_order_id_reviewer_user_id_reviewed_user_id_unique",
    ).on(table.order_id, table.reviewer_user_id, table.reviewed_user_id),
    reviewedUserIdIdx: index("reviews_reviewed_user_id_idx").on(
      table.reviewed_user_id,
    ),
  }),
);

/**
 * VERIFICATION_SUBMISSIONS TABLE
 * Seller KYC/business verification submissions.
 * Tracks identity verification, business license, etc.
 */
export const verificationSubmissions = pgTable(
  "verification_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    verification_type: text("verification_type", {
      enum: [
        VerificationType.IDENTITY,
        VerificationType.BUSINESS,
        VerificationType.PHONE,
        VerificationType.EMAIL,
      ],
    }).notNull(),
    status: text("status", {
      enum: [
        VerificationStatus.PENDING,
        VerificationStatus.APPROVED,
        VerificationStatus.REJECTED,
        VerificationStatus.EXPIRED,
      ],
    })
      .notNull()
      .default(VerificationStatus.PENDING),

    // Document URLs (stored separately or in JSON for flexibility)
    document_urls_json: jsonb("document_urls_json"),

    // Admin review
    reviewed_at: timestamp("reviewed_at", { withTimezone: true }),
    reviewed_by: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    rejection_reason: text("rejection_reason"),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userTypeIdx: index(
      "verification_submissions_user_id_verification_type_idx",
    ).on(table.user_id, table.verification_type),
    statusIdx: index("verification_submissions_status_idx").on(table.status),
  }),
);

/**
 * REPORTS TABLE
 * User reporting, content abuse, fraud flags, and session incidents.
 * Enables community moderation and safety enforcement.
 */
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporter_user_id: uuid("reporter_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reported_user_id: uuid("reported_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),

    // Context of the report
    session_id: uuid("session_id").references(() => liveSessions.id, {
      onDelete: "set null",
    }),
    listing_id: uuid("listing_id").references(() => listings.id, {
      onDelete: "set null",
    }),
    message_id: uuid("message_id").references(() => messages.id, {
      onDelete: "set null",
    }),

    // Report details
    reason: text("reason", {
      enum: [
        ReportReason.FRAUD,
        ReportReason.HARASSMENT,
        ReportReason.INAPPROPRIATE_CONTENT,
        ReportReason.FAKE_LISTING,
        ReportReason.NON_PAYMENT,
        ReportReason.SCAM,
        ReportReason.OTHER,
      ],
    }).notNull(),
    details: text("details"),

    // Status tracking
    status: text("status", {
      enum: [
        ReportStatus.OPEN,
        ReportStatus.IN_REVIEW,
        ReportStatus.RESOLVED,
        ReportStatus.CLOSED,
      ],
    })
      .notNull()
      .default(ReportStatus.OPEN),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    reporterIdIdx: index("reports_reporter_user_id_status_created_at_idx").on(
      table.reporter_user_id,
      table.status,
      table.created_at,
    ),
    reportedUserIdIdx: index("reports_reported_user_id_status_idx").on(
      table.reported_user_id,
      table.status,
    ),
    statusIdx: index("reports_status_idx").on(table.status),
  }),
);

/**
 * BLOCKS TABLE
 * Hard user-level blocking for chat and session safety.
 * Prevents communication and interaction between users.
 */
export const blocks = pgTable(
  "blocks",
  {
    blocker_user_id: uuid("blocker_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blocked_user_id: uuid("blocked_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    blockerBlockedUnique: uniqueIndex(
      "blocks_blocker_user_id_blocked_user_id_unique",
    ).on(table.blocker_user_id, table.blocked_user_id),
  }),
);

// Type inference for INSERT and SELECT operations
export type InsertReview = typeof reviews.$inferInsert;
export type SelectReview = typeof reviews.$inferSelect;

export type InsertVerificationSubmission =
  typeof verificationSubmissions.$inferInsert;
export type SelectVerificationSubmission =
  typeof verificationSubmissions.$inferSelect;

export type InsertReport = typeof reports.$inferInsert;
export type SelectReport = typeof reports.$inferSelect;

export type InsertBlock = typeof blocks.$inferInsert;
export type SelectBlock = typeof blocks.$inferSelect;
