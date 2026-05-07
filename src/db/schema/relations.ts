/**
 * Database Relations & Relationships
 *
 * Defines the relational mappings between tables for:
 * - Foreign key relationships
 * - Query optimization with joins
 * - Type-safe association traversal
 */

import { relations } from "drizzle-orm";
import { users } from "./auth";
import { authIdentities, authOtps, userSessions } from "./auth";
import {
  userProfiles,
  sellerProfiles,
  userAddresses,
  userSettings,
} from "./users";
import {
  categories,
  listings,
  listingMedia,
  listingInventory,
  listingServiceMeta,
} from "./catalog";
import {
  liveSessions,
  liveSessionListings,
  liveSessionParticipants,
  liveSessionMediaAssets,
  webrtcPeers,
  sellerFollows,
  savedListings,
  liveReminders,
  feedImpressions,
} from "./sessions";
import { negotiationThreads, offers, negotiationEvents } from "./negotiation";
import {
  conversations,
  conversationParticipants,
  messages,
  messageAttachments,
  messageReceipts,
} from "./messaging";
import {
  orders,
  orderItems,
  payments,
  shipments,
  sellerPayouts,
} from "./commerce";
import { reviews, verificationSubmissions, reports, blocks } from "./trust";
import { notifications, notificationDeliveries } from "./notifications";

// ============================================================================
// IDENTITY & AUTHENTICATION RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  // Profile relations
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.user_id],
  }),
  seller_profile: one(sellerProfiles, {
    fields: [users.id],
    references: [sellerProfiles.user_id],
  }),
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.user_id],
  }),

  // Authentication relations
  identities: many(authIdentities),
  otps: many(authOtps),
  sessions: many(userSessions),

  // Address relations
  addresses: many(userAddresses),

  // Seller relations
  listings: many(listings, { relationName: "seller_listings" }),
  live_sessions: many(liveSessions),
  seller_follows: many(sellerFollows, {
    relationName: "seller_follows_seller",
  }),
  followers: many(sellerFollows, { relationName: "seller_follows_followers" }),

  // Buyer relations
  saved_listings: many(savedListings),
  live_reminders: many(liveReminders),

  // Session participation
  session_participations: many(liveSessionParticipants),
  webrtc_peers: many(webrtcPeers),

  // Commerce relations
  orders_as_buyer: many(orders, { relationName: "buyer_orders" }),
  orders_as_seller: many(orders, { relationName: "seller_orders" }),
  payments: many(payments),
  seller_payouts: many(sellerPayouts),
  shipments: many(shipments),

  // Negotiation relations
  buyer_negotiations: many(negotiationThreads, {
    relationName: "buyer_negotiations",
  }),
  seller_negotiations: many(negotiationThreads, {
    relationName: "seller_negotiations",
  }),
  sent_offers: many(offers),

  // Messaging relations
  sent_messages: many(messages),
  message_receipts: many(messageReceipts),
  conversations: many(conversationParticipants),

  // Trust & Safety
  reviews_as_reviewer: many(reviews, { relationName: "reviews_reviewer" }),
  reviews_as_reviewed: many(reviews, { relationName: "reviews_reviewed" }),
  reports_as_reporter: many(reports, { relationName: "reports_reporter" }),
  reports_as_reported: many(reports, { relationName: "reports_reported" }),
  verification_submissions: many(verificationSubmissions),
  blocks_as_blocker: many(blocks, { relationName: "blocks_blocker" }),
  blocks_as_blocked: many(blocks, { relationName: "blocks_blocked" }),

  // Notifications
  notifications: many(notifications),
}));

export const authIdentitiesRelations = relations(authIdentities, ({ one }) => ({
  user: one(users, {
    fields: [authIdentities.user_id],
    references: [users.id],
  }),
}));

export const authOtpsRelations = relations(authOtps, ({ one }) => ({
  user: one(users, {
    fields: [authOtps.user_id],
    references: [users.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.user_id],
    references: [users.id],
  }),
}));

// ============================================================================
// USER PROFILE RELATIONS
// ============================================================================

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.user_id],
    references: [users.id],
  }),
}));

export const sellerProfilesRelations = relations(
  sellerProfiles,
  ({ one, many }) => ({
    user: one(users, {
      fields: [sellerProfiles.user_id],
      references: [users.id],
    }),
  }),
);

export const userAddressesRelations = relations(userAddresses, ({ one }) => ({
  user: one(users, {
    fields: [userAddresses.user_id],
    references: [users.id],
  }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.user_id],
    references: [users.id],
  }),
}));

// ============================================================================
// CATALOG RELATIONS
// ============================================================================

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parent_id],
    references: [categories.id],
    relationName: "children",
  }),
  children: many(categories, {
    relationName: "children",
  }),
  listings: many(listings),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  seller: one(users, {
    fields: [listings.seller_id],
    references: [users.id],
    relationName: "seller_listings",
  }),
  category: one(categories, {
    fields: [listings.category_id],
    references: [categories.id],
  }),
  media: many(listingMedia),
  inventory: one(listingInventory),
  service_meta: one(listingServiceMeta),
  session_listings: many(liveSessionListings),
  saved_by: many(savedListings),
  negotiation_threads: many(negotiationThreads),
  offers: many(offers),
  order_items: many(orderItems),
}));

export const listingMediaRelations = relations(listingMedia, ({ one }) => ({
  listing: one(listings, {
    fields: [listingMedia.listing_id],
    references: [listings.id],
  }),
}));

export const listingInventoryRelations = relations(
  listingInventory,
  ({ one }) => ({
    listing: one(listings, {
      fields: [listingInventory.listing_id],
      references: [listings.id],
    }),
  }),
);

export const listingServiceMetaRelations = relations(
  listingServiceMeta,
  ({ one }) => ({
    listing: one(listings, {
      fields: [listingServiceMeta.listing_id],
      references: [listings.id],
    }),
  }),
);

// ============================================================================
// LIVE SESSION RELATIONS
// ============================================================================

export const liveSessionsRelations = relations(
  liveSessions,
  ({ one, many }) => ({
    seller: one(users, {
      fields: [liveSessions.seller_id],
      references: [users.id],
    }),
    primary_listing: one(listings, {
      fields: [liveSessions.primary_listing_id],
      references: [listings.id],
    }),
    listings: many(liveSessionListings),
    participants: many(liveSessionParticipants),
    media_assets: many(liveSessionMediaAssets),
    webrtc_peers: many(webrtcPeers),
    negotiation_threads: many(negotiationThreads),
    offers: many(offers),
    negotiation_events: many(negotiationEvents),
    conversations: many(conversations),
    feed_impressions: many(feedImpressions),
  }),
);

export const liveSessionListingsRelations = relations(
  liveSessionListings,
  ({ one }) => ({
    session: one(liveSessions, {
      fields: [liveSessionListings.session_id],
      references: [liveSessions.id],
    }),
    listing: one(listings, {
      fields: [liveSessionListings.listing_id],
      references: [listings.id],
    }),
  }),
);

export const liveSessionParticipantsRelations = relations(
  liveSessionParticipants,
  ({ one }) => ({
    session: one(liveSessions, {
      fields: [liveSessionParticipants.session_id],
      references: [liveSessions.id],
    }),
    user: one(users, {
      fields: [liveSessionParticipants.user_id],
      references: [users.id],
    }),
  }),
);

export const liveSessionMediaAssetsRelations = relations(
  liveSessionMediaAssets,
  ({ one }) => ({
    session: one(liveSessions, {
      fields: [liveSessionMediaAssets.session_id],
      references: [liveSessions.id],
    }),
  }),
);

export const webrtcPeersRelations = relations(webrtcPeers, ({ one }) => ({
  session: one(liveSessions, {
    fields: [webrtcPeers.session_id],
    references: [liveSessions.id],
  }),
  user: one(users, {
    fields: [webrtcPeers.user_id],
    references: [users.id],
  }),
}));

export const sellerFollowsRelations = relations(sellerFollows, ({ one }) => ({
  seller: one(users, {
    fields: [sellerFollows.seller_id],
    references: [users.id],
    relationName: "seller_follows_seller",
  }),
  follower: one(users, {
    fields: [sellerFollows.user_id],
    references: [users.id],
    relationName: "seller_follows_followers",
  }),
}));

export const savedListingsRelations = relations(savedListings, ({ one }) => ({
  user: one(users, {
    fields: [savedListings.user_id],
    references: [users.id],
  }),
  listing: one(listings, {
    fields: [savedListings.listing_id],
    references: [listings.id],
  }),
}));

export const liveRemindersRelations = relations(liveReminders, ({ one }) => ({
  user: one(users, {
    fields: [liveReminders.user_id],
    references: [users.id],
  }),
  session: one(liveSessions, {
    fields: [liveReminders.session_id],
    references: [liveSessions.id],
  }),
}));

export const feedImpressionsRelations = relations(
  feedImpressions,
  ({ one }) => ({
    user: one(users, {
      fields: [feedImpressions.user_id],
      references: [users.id],
    }),
    session: one(liveSessions, {
      fields: [feedImpressions.session_id],
      references: [liveSessions.id],
    }),
    listing: one(listings, {
      fields: [feedImpressions.listing_id],
      references: [listings.id],
    }),
  }),
);

// ============================================================================
// NEGOTIATION RELATIONS
// ============================================================================

export const negotiationThreadsRelations = relations(
  negotiationThreads,
  ({ one, many }) => ({
    session: one(liveSessions, {
      fields: [negotiationThreads.session_id],
      references: [liveSessions.id],
    }),
    listing: one(listings, {
      fields: [negotiationThreads.listing_id],
      references: [listings.id],
    }),
    buyer: one(users, {
      fields: [negotiationThreads.buyer_id],
      references: [users.id],
      relationName: "buyer_negotiations",
    }),
    seller: one(users, {
      fields: [negotiationThreads.seller_id],
      references: [users.id],
      relationName: "seller_negotiations",
    }),
    accepted_offer: one(offers, {
      fields: [negotiationThreads.accepted_offer_id],
      references: [offers.id],
    }),
    offers: many(offers),
    events: many(negotiationEvents),
    orders: many(orders),
  }),
);

export const offersRelations = relations(offers, ({ one, many }) => ({
  thread: one(negotiationThreads, {
    fields: [offers.thread_id],
    references: [negotiationThreads.id],
  }),
  session: one(liveSessions, {
    fields: [offers.session_id],
    references: [liveSessions.id],
  }),
  listing: one(listings, {
    fields: [offers.listing_id],
    references: [listings.id],
  }),
  sender: one(users, {
    fields: [offers.sender_user_id],
    references: [users.id],
  }),
  parent_offer: one(offers, {
    fields: [offers.parent_offer_id],
    references: [offers.id],
    relationName: "counter_offers",
  }),
  counter_offers: many(offers, {
    relationName: "counter_offers",
  }),
}));

export const negotiationEventsRelations = relations(
  negotiationEvents,
  ({ one }) => ({
    thread: one(negotiationThreads, {
      fields: [negotiationEvents.thread_id],
      references: [negotiationThreads.id],
    }),
    session: one(liveSessions, {
      fields: [negotiationEvents.session_id],
      references: [liveSessions.id],
    }),
    actor: one(users, {
      fields: [negotiationEvents.actor_user_id],
      references: [users.id],
    }),
  }),
);

// ============================================================================
// MESSAGING RELATIONS
// ============================================================================

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    seller: one(users, {
      fields: [conversations.seller_id],
      references: [users.id],
    }),
    listing: one(listings, {
      fields: [conversations.listing_id],
      references: [listings.id],
    }),
    session: one(liveSessions, {
      fields: [conversations.session_id],
      references: [liveSessions.id],
    }),
    participants: many(conversationParticipants),
    messages: many(messages),
  }),
);

export const conversationParticipantsRelations = relations(
  conversationParticipants,
  ({ one }) => ({
    conversation: one(conversations, {
      fields: [conversationParticipants.conversation_id],
      references: [conversations.id],
    }),
    user: one(users, {
      fields: [conversationParticipants.user_id],
      references: [users.id],
    }),
  }),
);

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversation_id],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.sender_user_id],
    references: [users.id],
  }),
  shared_listing: one(listings, {
    fields: [messages.shared_listing_id],
    references: [listings.id],
  }),
  attachments: many(messageAttachments),
  receipts: many(messageReceipts),
}));

export const messageAttachmentsRelations = relations(
  messageAttachments,
  ({ one }) => ({
    message: one(messages, {
      fields: [messageAttachments.message_id],
      references: [messages.id],
    }),
  }),
);

export const messageReceiptsRelations = relations(
  messageReceipts,
  ({ one }) => ({
    message: one(messages, {
      fields: [messageReceipts.message_id],
      references: [messages.id],
    }),
    user: one(users, {
      fields: [messageReceipts.user_id],
      references: [users.id],
    }),
  }),
);

// ============================================================================
// COMMERCE RELATIONS
// ============================================================================

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(users, {
    fields: [orders.buyer_id],
    references: [users.id],
    relationName: "buyer_orders",
  }),
  seller: one(users, {
    fields: [orders.seller_id],
    references: [users.id],
    relationName: "seller_orders",
  }),
  session: one(liveSessions, {
    fields: [orders.session_id],
    references: [liveSessions.id],
  }),
  thread: one(negotiationThreads, {
    fields: [orders.thread_id],
    references: [negotiationThreads.id],
  }),
  accepted_offer: one(offers, {
    fields: [orders.accepted_offer_id],
    references: [offers.id],
  }),
  shipping_address: one(userAddresses, {
    fields: [orders.shipping_address_id],
    references: [userAddresses.id],
  }),
  items: many(orderItems),
  payments: many(payments),
  shipments: many(shipments),
  payouts: many(sellerPayouts),
  reviews: many(reviews),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.order_id],
    references: [orders.id],
  }),
  listing: one(listings, {
    fields: [orderItems.listing_id],
    references: [listings.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.order_id],
    references: [orders.id],
  }),
}));

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  order: one(orders, {
    fields: [shipments.order_id],
    references: [orders.id],
  }),
}));

export const sellerPayoutsRelations = relations(sellerPayouts, ({ one }) => ({
  seller: one(users, {
    fields: [sellerPayouts.seller_id],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [sellerPayouts.order_id],
    references: [orders.id],
  }),
}));

// ============================================================================
// TRUST & SAFETY RELATIONS
// ============================================================================

export const reviewsRelations = relations(reviews, ({ one }) => ({
  order: one(orders, {
    fields: [reviews.order_id],
    references: [orders.id],
  }),
  reviewer: one(users, {
    fields: [reviews.reviewer_user_id],
    references: [users.id],
    relationName: "reviews_reviewer",
  }),
  reviewed: one(users, {
    fields: [reviews.reviewed_user_id],
    references: [users.id],
    relationName: "reviews_reviewed",
  }),
}));

export const verificationSubmissionsRelations = relations(
  verificationSubmissions,
  ({ one }) => ({
    user: one(users, {
      fields: [verificationSubmissions.user_id],
      references: [users.id],
    }),
    reviewed_by: one(users, {
      fields: [verificationSubmissions.reviewed_by],
      references: [users.id],
    }),
  }),
);

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(users, {
    fields: [reports.reporter_user_id],
    references: [users.id],
    relationName: "reports_reporter",
  }),
  reported: one(users, {
    fields: [reports.reported_user_id],
    references: [users.id],
    relationName: "reports_reported",
  }),
  session: one(liveSessions, {
    fields: [reports.session_id],
    references: [liveSessions.id],
  }),
  listing: one(listings, {
    fields: [reports.listing_id],
    references: [listings.id],
  }),
  message: one(messages, {
    fields: [reports.message_id],
    references: [messages.id],
  }),
}));

export const blocksRelations = relations(blocks, ({ one }) => ({
  blocker: one(users, {
    fields: [blocks.blocker_user_id],
    references: [users.id],
    relationName: "blocks_blocker",
  }),
  blocked: one(users, {
    fields: [blocks.blocked_user_id],
    references: [users.id],
    relationName: "blocks_blocked",
  }),
}));

// ============================================================================
// NOTIFICATIONS RELATIONS
// ============================================================================

export const notificationsRelations = relations(
  notifications,
  ({ one, many }) => ({
    user: one(users, {
      fields: [notifications.user_id],
      references: [users.id],
    }),
    deliveries: many(notificationDeliveries),
  }),
);

export const notificationDeliveriesRelations = relations(
  notificationDeliveries,
  ({ one }) => ({
    notification: one(notifications, {
      fields: [notificationDeliveries.notification_id],
      references: [notifications.id],
    }),
  }),
);
