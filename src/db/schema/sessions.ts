/**
 * Live Negotiation Sessions Schema
 *
 * Core tables for:
 * - Scheduled and live negotiation rooms
 * - Session participants and room membership
 * - Session-specific media assets
 * - WebRTC connection tracking
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
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { listings } from "./catalog";
import {
  AssetType,
  ImpressionType,
  JoinSource,
  LiveSessionStatus,
  ParticipantRole,
  ReminderStatus,
  RoomAtmosphere,
  SessionType,
} from "./enums";

/**
 * LIVE_SESSIONS TABLE
 * Scheduled/live room entity shown in feed and seller dashboards.
 * This is the core "haggle room" that brings buyers and sellers together.
 * Includes denormalized cached metrics for feed performance.
 */
export const liveSessions = pgTable(
  "live_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seller_id: uuid("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    primary_listing_id: uuid("primary_listing_id").references(
      () => listings.id,
      {
        onDelete: "set null",
      },
    ),

    // Basic info
    title: text("title").notNull(),
    description: text("description"),
    status: text("status", {
      enum: [
        LiveSessionStatus.DRAFT,
        LiveSessionStatus.SCHEDULED,
        LiveSessionStatus.LIVE,
        LiveSessionStatus.ENDED,
        LiveSessionStatus.CANCELLED,
      ],
    })
      .notNull()
      .default(LiveSessionStatus.DRAFT),

    // Session type and atmosphere
    session_type: text("session_type", {
      enum: [SessionType.FLASH, SessionType.STANDARD, SessionType.PREMIER],
    }).notNull(),
    room_atmosphere: text("room_atmosphere", {
      enum: [
        RoomAtmosphere.MARKETPLACE,
        RoomAtmosphere.BOUTIQUE,
        RoomAtmosphere.GARAGE_SALE,
        RoomAtmosphere.AUCTION_HOUSE,
        RoomAtmosphere.WORKSHOP,
      ],
    }).notNull(),

    // Timing
    scheduled_start_at: timestamp("scheduled_start_at", {
      withTimezone: true,
    }).notNull(),
    actual_start_at: timestamp("actual_start_at", { withTimezone: true }),
    actual_end_at: timestamp("actual_end_at", { withTimezone: true }),

    // Pricing parameters
    starting_price_amount: decimal("starting_price_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),
    reserve_price_amount: decimal("reserve_price_amount", {
      precision: 12,
      scale: 2,
    }),
    instant_buy_price_amount: decimal("instant_buy_price_amount", {
      precision: 12,
      scale: 2,
    }),
    min_increment_amount: decimal("min_increment_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),

    // Negotiation rules
    auto_accept_threshold_amount: decimal("auto_accept_threshold_amount", {
      precision: 12,
      scale: 2,
    }),
    auto_decline_threshold_amount: decimal("auto_decline_threshold_amount", {
      precision: 12,
      scale: 2,
    }),
    response_time_limit_seconds: integer("response_time_limit_seconds")
      .notNull()
      .default(120),
    max_counteroffers: integer("max_counteroffers").notNull().default(5),

    // Denormalized metrics for feed
    viewer_count_cached: integer("viewer_count_cached").notNull().default(0),
    offer_count_cached: integer("offer_count_cached").notNull().default(0),

    // Deal closure
    accepted_offer_id: uuid("accepted_offer_id"),

    // Media and streaming
    thumbnail_url: text("thumbnail_url"),
    stream_playback_url: text("stream_playback_url"),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    statusScheduledIdx: index("live_sessions_status_scheduled_start_at_idx").on(
      table.status,
      table.scheduled_start_at,
    ),
    statusActualIdx: index("live_sessions_status_actual_start_at_idx").on(
      table.status,
      table.actual_start_at,
    ),
    sellerStatusIdx: index(
      "live_sessions_seller_id_status_scheduled_start_at_idx",
    ).on(table.seller_id, table.status, table.scheduled_start_at),
  }),
);

/**
 * LIVE_SESSION_LISTINGS TABLE
 * Links products/services to a live session.
 * One session can feature multiple products.
 */
export const liveSessionListings = pgTable(
  "live_session_listings",
  {
    session_id: uuid("session_id")
      .notNull()
      .references(() => liveSessions.id, { onDelete: "cascade" }),
    listing_id: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    sort_order: integer("sort_order").notNull().default(0),
    is_primary: boolean("is_primary").notNull().default(false),
  },
  (table) => ({
    sessionIdListingIdUnique: uniqueIndex(
      "live_session_listings_session_id_listing_id_unique",
    ).on(table.session_id, table.listing_id),
  }),
);

/**
 * LIVE_SESSION_PARTICIPANTS TABLE
 * Room membership, hand raise state, mute state, and participation tracking.
 * Tracks who joined the room and their interaction state.
 */
export const liveSessionParticipants = pgTable(
  "live_session_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    session_id: uuid("session_id")
      .notNull()
      .references(() => liveSessions.id, { onDelete: "cascade" }),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", {
      enum: [
        ParticipantRole.SELLER,
        ParticipantRole.BUYER,
        ParticipantRole.VIEWER,
        ParticipantRole.MODERATOR,
      ],
    }).notNull(),
    join_source: text("join_source", {
      enum: [
        JoinSource.FEED,
        JoinSource.PROFILE,
        JoinSource.REMINDER,
        JoinSource.SHARE_LINK,
      ],
    }).notNull(),
    joined_at: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    left_at: timestamp("left_at", { withTimezone: true }),
    is_muted: boolean("is_muted").notNull().default(false),
    hand_raised: boolean("hand_raised").notNull().default(false),
    is_active: boolean("is_active").notNull().default(true),
  },
  (table) => ({
    sessionUserUnique: uniqueIndex(
      "live_session_participants_session_id_user_id_unique",
    ).on(table.session_id, table.user_id),
    sessionIdIdx: index("live_session_participants_session_id_idx").on(
      table.session_id,
    ),
    userIdIdx: index("live_session_participants_user_id_idx").on(table.user_id),
  }),
);

/**
 * LIVE_SESSION_MEDIA_ASSETS TABLE
 * Session-specific previews, posters, and demo video sources.
 * Separate from listing media for session-specific customization.
 */
export const liveSessionMediaAssets = pgTable(
  "live_session_media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    session_id: uuid("session_id")
      .notNull()
      .references(() => liveSessions.id, { onDelete: "cascade" }),
    asset_type: text("asset_type", {
      enum: [
        AssetType.POSTER,
        AssetType.PREVIEW_CLIP,
        AssetType.STREAM_SOURCE,
        AssetType.GALLERY,
      ],
    }).notNull(),
    url: text("url").notNull(),
    metadata_json: jsonb("metadata_json"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    sessionIdIdx: index("live_session_media_assets_session_id_idx").on(
      table.session_id,
    ),
  }),
);

/**
 * WEBRTC_PEERS TABLE
 * Transient metadata for WebRTC signaling and reconnect support.
 * Stores peer connection state during active negotiations.
 */
export const webrtcPeers = pgTable(
  "webrtc_peers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    session_id: uuid("session_id")
      .notNull()
      .references(() => liveSessions.id, { onDelete: "cascade" }),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    connection_role: text("connection_role"), // 'offerer' or 'answerer'
    peer_state: text("peer_state"), // 'connecting', 'connected', 'failed', 'disconnected'
    last_heartbeat_at: timestamp("last_heartbeat_at", { withTimezone: true })
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
    sessionIdIdx: index("webrtc_peers_session_id_idx").on(table.session_id),
    userIdIdx: index("webrtc_peers_user_id_idx").on(table.user_id),
  }),
);

/**
 * SELLER_FOLLOWS TABLE
 * Tracks follower relationships for sellers.
 * Powers seller follower counts and "notify followers" flows.
 */
export const sellerFollows = pgTable(
  "seller_follows",
  {
    seller_id: uuid("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    sellerUserUnique: uniqueIndex("seller_follows_seller_id_user_id_unique").on(
      table.seller_id,
      table.user_id,
    ),
    sellerIdIdx: index("seller_follows_seller_id_idx").on(table.seller_id),
  }),
);

/**
 * SAVED_LISTINGS TABLE
 * Tracks saved deals for quick return flows and user bookmarks.
 */
export const savedListings = pgTable(
  "saved_listings",
  {
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listing_id: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userListingUnique: uniqueIndex(
      "saved_listings_user_id_listing_id_unique",
    ).on(table.user_id, table.listing_id),
    userIdIdx: index("saved_listings_user_id_idx").on(table.user_id),
  }),
);

/**
 * LIVE_REMINDERS TABLE
 * Reserved live tickets / reminders for scheduled sessions.
 * Users get notified before a session goes live.
 */
export const liveReminders = pgTable(
  "live_reminders",
  {
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    session_id: uuid("session_id")
      .notNull()
      .references(() => liveSessions.id, { onDelete: "cascade" }),
    remind_at: timestamp("remind_at", { withTimezone: true }).notNull(),
    status: text("status", {
      enum: [
        ReminderStatus.ACTIVE,
        ReminderStatus.SENT,
        ReminderStatus.CANCELLED,
      ],
    })
      .notNull()
      .default(ReminderStatus.ACTIVE),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userSessionUnique: uniqueIndex(
      "live_reminders_user_id_session_id_unique",
    ).on(table.user_id, table.session_id),
    userIdIdx: index("live_reminders_user_id_idx").on(table.user_id),
    remindAtIdx: index("live_reminders_remind_at_idx").on(table.remind_at),
  }),
);

/**
 * FEED_IMPRESSIONS TABLE
 * Ranking, personalization, and analytics data.
 * Tracks every interaction with listings and sessions for analytics.
 */
export const feedImpressions = pgTable(
  "feed_impressions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    session_id: uuid("session_id").references(() => liveSessions.id, {
      onDelete: "cascade",
    }),
    listing_id: uuid("listing_id").references(() => listings.id, {
      onDelete: "cascade",
    }),
    impression_type: text("impression_type", {
      enum: [
        ImpressionType.VIEW,
        ImpressionType.TAP,
        ImpressionType.WATCH,
        ImpressionType.SHARE,
        ImpressionType.SAVE,
      ],
    }).notNull(),
    watch_ms: integer("watch_ms"), // Milliseconds watched
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index("feed_impressions_user_id_created_at_idx").on(
      table.user_id,
      table.created_at,
    ),
    sessionIdIdx: index("feed_impressions_session_id_idx").on(table.session_id),
    listingIdIdx: index("feed_impressions_listing_id_idx").on(table.listing_id),
  }),
);

// Type inference for INSERT and SELECT operations
export type InsertLiveSession = typeof liveSessions.$inferInsert;
export type SelectLiveSession = typeof liveSessions.$inferSelect;

export type InsertLiveSessionListing = typeof liveSessionListings.$inferInsert;
export type SelectLiveSessionListing = typeof liveSessionListings.$inferSelect;

export type InsertLiveSessionParticipant =
  typeof liveSessionParticipants.$inferInsert;
export type SelectLiveSessionParticipant =
  typeof liveSessionParticipants.$inferSelect;

export type InsertLiveSessionMediaAsset =
  typeof liveSessionMediaAssets.$inferInsert;
export type SelectLiveSessionMediaAsset =
  typeof liveSessionMediaAssets.$inferSelect;

export type InsertWebrtcPeer = typeof webrtcPeers.$inferInsert;
export type SelectWebrtcPeer = typeof webrtcPeers.$inferSelect;

export type InsertSellerFollow = typeof sellerFollows.$inferInsert;
export type SelectSellerFollow = typeof sellerFollows.$inferSelect;

export type InsertSavedListing = typeof savedListings.$inferInsert;
export type SelectSavedListing = typeof savedListings.$inferSelect;

export type InsertLiveReminder = typeof liveReminders.$inferInsert;
export type SelectLiveReminder = typeof liveReminders.$inferSelect;

export type InsertFeedImpression = typeof feedImpressions.$inferInsert;
export type SelectFeedImpression = typeof feedImpressions.$inferSelect;
