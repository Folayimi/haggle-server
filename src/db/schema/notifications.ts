/**
 * Notifications & Push Schema
 *
 * Core tables for:
 * - In-app notification center
 * - Push, email, and SMS delivery tracking
 * - Notification delivery audit trail
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import {
  NotificationDeliveryChannel,
  NotificationDeliveryStatus,
  NotificationType,
} from "./enums";

/**
 * NOTIFICATIONS TABLE
 * In-app notification center.
 * Every notification shown to a user is a record here.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: [
        NotificationType.SESSION_REMINDER,
        NotificationType.OFFER_RECEIVED,
        NotificationType.OFFER_ACCEPTED,
        NotificationType.MESSAGE_RECEIVED,
        NotificationType.FOLLOWER_ALERT,
        NotificationType.SYSTEM,
      ],
    }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),

    // Optional payload for deep linking or context
    payload_json: jsonb("payload_json"),

    // Read status
    read_at: timestamp("read_at", { withTimezone: true }),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userCreatedIdx: index("notifications_user_id_created_at_desc_idx").on(
      table.user_id,
      table.created_at,
    ),
    userReadIdx: index("notifications_user_id_read_at_idx").on(
      table.user_id,
      table.read_at,
    ),
  }),
);

/**
 * NOTIFICATION_DELIVERIES TABLE
 * Push/email/SMS delivery audit.
 * Tracks which channels were used and their success/failure status.
 */
export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    notification_id: uuid("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    channel: text("channel", {
      enum: [
        NotificationDeliveryChannel.IN_APP,
        NotificationDeliveryChannel.PUSH,
        NotificationDeliveryChannel.EMAIL,
        NotificationDeliveryChannel.SMS,
      ],
    }).notNull(),
    provider_message_id: text("provider_message_id"),
    status: text("status", {
      enum: [
        NotificationDeliveryStatus.PENDING,
        NotificationDeliveryStatus.SENT,
        NotificationDeliveryStatus.FAILED,
        NotificationDeliveryStatus.BOUNCED,
      ],
    })
      .notNull()
      .default(NotificationDeliveryStatus.PENDING),
    sent_at: timestamp("sent_at", { withTimezone: true }),
    failed_at: timestamp("failed_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    notificationIdIdx: index("notification_deliveries_notification_id_idx").on(
      table.notification_id,
    ),
    statusIdx: index("notification_deliveries_status_idx").on(table.status),
  }),
);

// Type inference for INSERT and SELECT operations
export type InsertNotification = typeof notifications.$inferInsert;
export type SelectNotification = typeof notifications.$inferSelect;

export type InsertNotificationDelivery =
  typeof notificationDeliveries.$inferInsert;
export type SelectNotificationDelivery =
  typeof notificationDeliveries.$inferSelect;
