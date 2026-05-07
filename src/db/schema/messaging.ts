/**
 * Messaging & Communication Schema
 *
 * Core tables for:
 * - Direct messaging between buyers and sellers
 * - Conversation state and metadata
 * - Message types (text, voice, images, product shares)
 * - Message delivery receipts
 * - Message attachments
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  index,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { listings } from "./catalog";
import { liveSessions } from "./sessions";
import {
  AttachmentType,
  ConversationType,
  MessageReceiptStatus,
  MessageType,
} from "./enums";

/**
 * CONVERSATIONS TABLE
 * Buyer-seller direct chat outside the live room, plus fallback negotiation chat.
 */
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversation_type: text("conversation_type", {
      enum: [
        ConversationType.DIRECT,
        ConversationType.SUPPORT,
        ConversationType.SESSION_SIDECHAT,
      ],
    }).notNull(),
    seller_id: uuid("seller_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    listing_id: uuid("listing_id").references(() => listings.id, {
      onDelete: "cascade",
    }),
    session_id: uuid("session_id").references(() => liveSessions.id, {
      onDelete: "cascade",
    }),

    // Metadata for quick access
    last_message_at: timestamp("last_message_at", { withTimezone: true }),
    last_message_preview: text("last_message_preview"),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    lastMessageAtIdx: index("conversations_last_message_at_desc_idx").on(
      table.last_message_at,
    ),
    sessionIdIdx: index("conversations_session_id_idx").on(table.session_id),
  }),
);

/**
 * CONVERSATION_PARTICIPANTS TABLE
 * Membership and per-user conversation state.
 * Tracks who's in the conversation and their read status.
 */
export const conversationParticipants = pgTable(
  "conversation_participants",
  {
    conversation_id: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Read state
    last_read_message_id: uuid("last_read_message_id"),
    last_read_at: timestamp("last_read_at", { withTimezone: true }),

    // User preferences
    is_archived: boolean("is_archived").notNull().default(false),
    is_muted: boolean("is_muted").notNull().default(false),
  },
  (table) => ({
    conversationUserUnique: uniqueIndex(
      "conversation_participants_conversation_user_unique",
    ).on(table.conversation_id, table.user_id),
    conversationIdIdx: index(
      "conversation_participants_conversation_id_idx",
    ).on(table.conversation_id),
    userIdIdx: index("conversation_participants_user_id_idx").on(table.user_id),
  }),
);

/**
 * MESSAGES TABLE
 * Text, voice notes, screenshots, product shares, and system notices.
 * Supports soft deletes (deleted_at) for audit trails.
 */
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversation_id: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    sender_user_id: uuid("sender_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Message content
    message_type: text("message_type", {
      enum: [
        MessageType.TEXT,
        MessageType.VOICE,
        MessageType.IMAGE,
        MessageType.PRODUCT_SHARE,
        MessageType.SYSTEM,
      ],
    }).notNull(),
    text_body: text("text_body"),

    // Voice messages
    voice_url: text("voice_url"),
    voice_duration_seconds: integer("voice_duration_seconds"),

    // Product sharing
    shared_listing_id: uuid("shared_listing_id").references(() => listings.id, {
      onDelete: "set null",
    }),

    // Flexible metadata
    metadata_json: text("metadata_json"),

    // Edit and delete tracking
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    edited_at: timestamp("edited_at", { withTimezone: true }),
    deleted_at: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    conversationCreatedIdx: index("messages_conversation_id_created_at_idx").on(
      table.conversation_id,
      table.created_at,
    ),
  }),
);

/**
 * MESSAGE_ATTACHMENTS TABLE
 * Screenshots and media attachments linked to chat messages.
 */
export const messageAttachments = pgTable(
  "message_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    message_id: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    attachment_type: text("attachment_type", {
      enum: [
        AttachmentType.SCREENSHOT,
        AttachmentType.IMAGE,
        AttachmentType.VIDEO,
        AttachmentType.DOCUMENT,
      ],
    }).notNull(),
    url: text("url").notNull(),
    thumbnail_url: text("thumbnail_url"),
    size_bytes: integer("size_bytes"),
  },
  (table) => ({
    messageIdIdx: index("message_attachments_message_id_idx").on(
      table.message_id,
    ),
  }),
);

/**
 * MESSAGE_RECEIPTS TABLE
 * Sent/delivered/seen/read states shown in chat UI.
 * Allows granular tracking of message delivery.
 */
export const messageReceipts = pgTable(
  "message_receipts",
  {
    message_id: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: [
        MessageReceiptStatus.SENT,
        MessageReceiptStatus.DELIVERED,
        MessageReceiptStatus.SEEN,
        MessageReceiptStatus.READ,
      ],
    }).notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    messageUserUnique: uniqueIndex(
      "message_receipts_message_id_user_id_unique",
    ).on(table.message_id, table.user_id),
  }),
);

// Type inference for INSERT and SELECT operations
export type InsertConversation = typeof conversations.$inferInsert;
export type SelectConversation = typeof conversations.$inferSelect;

export type InsertConversationParticipant =
  typeof conversationParticipants.$inferInsert;
export type SelectConversationParticipant =
  typeof conversationParticipants.$inferSelect;

export type InsertMessage = typeof messages.$inferInsert;
export type SelectMessage = typeof messages.$inferSelect;

export type InsertMessageAttachment = typeof messageAttachments.$inferInsert;
export type SelectMessageAttachment = typeof messageAttachments.$inferSelect;

export type InsertMessageReceipt = typeof messageReceipts.$inferInsert;
export type SelectMessageReceipt = typeof messageReceipts.$inferSelect;
