/**
 * Database Schema Exports
 *
 * Central export point for all database tables and types.
 * This allows importing everything from `src/db/schema` for convenience.
 */

// Enums
export * from "./enums";

// Authentication & Identity
export {
  users,
  authIdentities,
  authOtps,
  userSessions,
  type InsertUser,
  type SelectUser,
  type InsertAuthIdentity,
  type SelectAuthIdentity,
  type InsertAuthOtp,
  type SelectAuthOtp,
  type InsertUserSession,
  type SelectUserSession,
} from "./auth";

// User Profiles
export {
  userProfiles,
  sellerProfiles,
  userAddresses,
  userSettings,
  type InsertUserProfile,
  type SelectUserProfile,
  type InsertSellerProfile,
  type SelectSellerProfile,
  type InsertUserAddress,
  type SelectUserAddress,
  type InsertUserSettings,
  type SelectUserSettings,
} from "./users";

// Catalog
export {
  categories,
  listings,
  listingMedia,
  listingInventory,
  listingServiceMeta,
  type InsertCategory,
  type SelectCategory,
  type InsertListing,
  type SelectListing,
  type InsertListingMedia,
  type SelectListingMedia,
  type InsertListingInventory,
  type SelectListingInventory,
  type InsertListingServiceMeta,
  type SelectListingServiceMeta,
} from "./catalog";

// Live Sessions
export {
  liveSessions,
  liveSessionListings,
  liveSessionParticipants,
  liveSessionMediaAssets,
  webrtcPeers,
  sellerFollows,
  savedListings,
  liveReminders,
  feedImpressions,
  type InsertLiveSession,
  type SelectLiveSession,
  type InsertLiveSessionListing,
  type SelectLiveSessionListing,
  type InsertLiveSessionParticipant,
  type SelectLiveSessionParticipant,
  type InsertLiveSessionMediaAsset,
  type SelectLiveSessionMediaAsset,
  type InsertWebrtcPeer,
  type SelectWebrtcPeer,
  type InsertSellerFollow,
  type SelectSellerFollow,
  type InsertSavedListing,
  type SelectSavedListing,
  type InsertLiveReminder,
  type SelectLiveReminder,
  type InsertFeedImpression,
  type SelectFeedImpression,
} from "./sessions";

// Negotiation
export {
  negotiationThreads,
  offers,
  negotiationEvents,
  type InsertNegotiationThread,
  type SelectNegotiationThread,
  type InsertOffer,
  type SelectOffer,
  type InsertNegotiationEvent,
  type SelectNegotiationEvent,
} from "./negotiation";

// Messaging
export {
  conversations,
  conversationParticipants,
  messages,
  messageAttachments,
  messageReceipts,
  type InsertConversation,
  type SelectConversation,
  type InsertConversationParticipant,
  type SelectConversationParticipant,
  type InsertMessage,
  type SelectMessage,
  type InsertMessageAttachment,
  type SelectMessageAttachment,
  type InsertMessageReceipt,
  type SelectMessageReceipt,
} from "./messaging";

// Commerce
export {
  orders,
  orderItems,
  payments,
  shipments,
  sellerPayouts,
  type InsertOrder,
  type SelectOrder,
  type InsertOrderItem,
  type SelectOrderItem,
  type InsertPayment,
  type SelectPayment,
  type InsertShipment,
  type SelectShipment,
  type InsertSellerPayout,
  type SelectSellerPayout,
} from "./commerce";

// Trust & Safety
export {
  reviews,
  verificationSubmissions,
  reports,
  blocks,
  type InsertReview,
  type SelectReview,
  type InsertVerificationSubmission,
  type SelectVerificationSubmission,
  type InsertReport,
  type SelectReport,
  type InsertBlock,
  type SelectBlock,
} from "./trust";

// Notifications
export {
  notifications,
  notificationDeliveries,
  type InsertNotification,
  type SelectNotification,
  type InsertNotificationDelivery,
  type SelectNotificationDelivery,
} from "./notifications";

// Relations
export * from "./relations";
