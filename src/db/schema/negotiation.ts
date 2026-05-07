/**
 * Negotiation & Offer Engine Schema
 *
 * Core tables for:
 * - Negotiation threads (each buyer gets a negotiation lane)
 * - Immutable offer/counter-offer history
 * - Audit trail of negotiation events and state changes
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  decimal,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { listings } from "./catalog";
import { liveSessions } from "./sessions";
import {
  NegotiationEventType,
  NegotiationThreadStatus,
  OfferKind,
} from "./enums";

/**
 * NEGOTIATION_THREADS TABLE
 * Each buyer gets a negotiation lane inside a live room or direct listing negotiation.
 * Models the conversation between buyer and seller around a specific offer.
 */
export const negotiationThreads = pgTable(
  "negotiation_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    session_id: uuid("session_id").references(() => liveSessions.id, {
      onDelete: "cascade",
    }),
    listing_id: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    buyer_id: uuid("buyer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    seller_id: uuid("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Negotiation state
    status: text("status", {
      enum: [
        NegotiationThreadStatus.ACTIVE,
        NegotiationThreadStatus.ACCEPTED,
        NegotiationThreadStatus.REJECTED,
        NegotiationThreadStatus.EXPIRED,
        NegotiationThreadStatus.CANCELLED,
      ],
    })
      .notNull()
      .default(NegotiationThreadStatus.ACTIVE),

    // Current offer tracking
    current_offer_amount: decimal("current_offer_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),
    last_offer_at: timestamp("last_offer_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),

    // Accepted deal
    accepted_offer_id: uuid("accepted_offer_id"),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    sellerStatusIdx: index(
      "negotiation_threads_seller_id_status_last_offer_at_idx",
    ).on(table.seller_id, table.status, table.last_offer_at),
    buyerStatusIdx: index(
      "negotiation_threads_buyer_id_status_last_offer_at_idx",
    ).on(table.buyer_id, table.status, table.last_offer_at),
    listingIdIdx: index("negotiation_threads_listing_id_idx").on(
      table.listing_id,
    ),
    sessionIdIdx: index("negotiation_threads_session_id_idx").on(
      table.session_id,
    ),
    expiresAtIdx: index("negotiation_threads_expires_at_idx").on(
      table.expires_at,
    ),
  }),
);

/**
 * OFFERS TABLE
 * Immutable price actions inside a negotiation thread.
 * Every offer, counter-offer, accept, reject is a record here.
 * Forms a complete audit trail of the negotiation.
 */
export const offers = pgTable(
  "offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    thread_id: uuid("thread_id")
      .notNull()
      .references(() => negotiationThreads.id, { onDelete: "cascade" }),
    session_id: uuid("session_id").references(() => liveSessions.id, {
      onDelete: "set null",
    }),
    listing_id: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    sender_user_id: uuid("sender_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Offer type
    offer_kind: text("offer_kind", {
      enum: [
        OfferKind.OFFER,
        OfferKind.COUNTER,
        OfferKind.ACCEPT,
        OfferKind.REJECT,
        OfferKind.INSTANT_BUY,
      ],
    }).notNull(),

    // Amount in transaction
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),

    // Sequence for ordering
    sequence_no: integer("sequence_no").notNull(),

    // Linked to parent offer (for counter-offers)
    parent_offer_id: uuid("parent_offer_id"),
    // .references(() => offers.id, {
    //   onDelete: "set null",
    // }),

    // Expiration for time-limited offers
    expires_at: timestamp("expires_at", { withTimezone: true }),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    threadSequenceIdx: index("offers_thread_id_sequence_no_idx").on(
      table.thread_id,
      table.sequence_no,
    ),
    sessionCreatedIdx: index("offers_session_id_created_at_idx").on(
      table.session_id,
      table.created_at,
    ),
    parentOfferIdx: index("offers_parent_offer_id_idx").on(
      table.parent_offer_id,
    ),
  }),
);

/**
 * NEGOTIATION_EVENTS TABLE
 * Append-only audit trail for behavioral events during negotiation.
 * Separate from offers to model user actions (timers, joins, muting, etc.)
 * and financial events in different tables.
 *
 * Examples of events:
 * - Timer started/ended
 * - User joined/left negotiation
 * - User raised/lowered hand
 * - Mute toggled
 * - Screenshot shared
 */
export const negotiationEvents = pgTable(
  "negotiation_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    thread_id: uuid("thread_id").references(() => negotiationThreads.id, {
      onDelete: "cascade",
    }),
    session_id: uuid("session_id")
      .notNull()
      .references(() => liveSessions.id, { onDelete: "cascade" }),
    actor_user_id: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    // Event classification
    event_type: text("event_type", {
      enum: [
        NegotiationEventType.TIMER_STARTED,
        NegotiationEventType.TIMER_ENDED,
        NegotiationEventType.USER_JOINED,
        NegotiationEventType.USER_LEFT,
        NegotiationEventType.HAND_RAISED,
        NegotiationEventType.MUTE_TOGGLED,
        NegotiationEventType.OFFER_MADE,
        NegotiationEventType.OFFER_ACCEPTED,
        NegotiationEventType.OFFER_DECLINED,
        NegotiationEventType.SCREENSHOT_SHARED,
      ],
    }).notNull(),

    // Event-specific metadata
    payload_json: jsonb("payload_json"),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    threadIdIdx: index("negotiation_events_thread_id_created_at_idx").on(
      table.thread_id,
      table.created_at,
    ),
    sessionIdIdx: index("negotiation_events_session_id_created_at_idx").on(
      table.session_id,
      table.created_at,
    ),
  }),
);

// Type inference for INSERT and SELECT operations
export type InsertNegotiationThread = typeof negotiationThreads.$inferInsert;
export type SelectNegotiationThread = typeof negotiationThreads.$inferSelect;

export type InsertOffer = typeof offers.$inferInsert;
export type SelectOffer = typeof offers.$inferSelect;

export type InsertNegotiationEvent = typeof negotiationEvents.$inferInsert;
export type SelectNegotiationEvent = typeof negotiationEvents.$inferSelect;
