/**
 * Enums for Haggle Schema
 *
 * Centralized source of truth for all enum types used across the database.
 * This prevents duplicating enum definitions and ensures consistency.
 */

export function enumValues<const T extends Record<string, string>>(enumObject: T) {
  return Object.values(enumObject) as [
    T[keyof T],
    ...T[keyof T][],
  ];
}

// User roles and status
export const UserPrimaryRole = {
  BUYER: "buyer",
  SELLER: "seller",
  BOTH: "both",
} as const;

export const UserStatus = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
  DELETED: "deleted",
} as const;

// Authentication
export const AuthProvider = {
  PHONE: "phone",
  EMAIL: "email",
  GOOGLE: "google",
  APPLE: "apple",
} as const;

export const OTPChannel = {
  SMS: "sms",
  EMAIL: "email",
} as const;

export const OTPPurpose = {
  SIGNUP: "signup",
  LOGIN: "login",
  RESET_PASSWORD: "reset_password",
  VERIFY_CONTACT: "verify_contact",
} as const;

// Listing and catalog
export const ListingType = {
  PRODUCT: "product",
  SERVICE: "service",
} as const;

export const ListingStatus = {
  DRAFT: "draft",
  ACTIVE: "active",
  PAUSED: "paused",
  ARCHIVED: "archived",
} as const;

export const CategoryKind = {
  PRODUCT: "product",
  SERVICE: "service",
  BOTH: "both",
} as const;

export const MediaType = {
  IMAGE: "image",
  VIDEO: "video",
} as const;

export const ServiceDeliveryMode = {
  REMOTE: "remote",
  ONSITE: "onsite",
  HYBRID: "hybrid",
} as const;

// Live sessions
export const LiveSessionStatus = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  LIVE: "live",
  ENDED: "ended",
  CANCELLED: "cancelled",
} as const;

export const SessionType = {
  FLASH: "flash",
  STANDARD: "standard",
  PREMIER: "premier",
} as const;

export const RoomAtmosphere = {
  MARKETPLACE: "marketplace",
  BOUTIQUE: "boutique",
  GARAGE_SALE: "garage_sale",
  AUCTION_HOUSE: "auction_house",
  WORKSHOP: "workshop",
} as const;

export const ParticipantRole = {
  SELLER: "seller",
  BUYER: "buyer",
  VIEWER: "viewer",
  MODERATOR: "moderator",
} as const;

export const JoinSource = {
  FEED: "feed",
  PROFILE: "profile",
  REMINDER: "reminder",
  SHARE_LINK: "share_link",
} as const;

export const AssetType = {
  POSTER: "poster",
  PREVIEW_CLIP: "preview_clip",
  STREAM_SOURCE: "stream_source",
  GALLERY: "gallery",
} as const;

export const ImpressionType = {
  VIEW: "view",
  TAP: "tap",
  WATCH: "watch",
  SHARE: "share",
  SAVE: "save",
} as const;

// Negotiation and offers
export const NegotiationThreadStatus = {
  ACTIVE: "active",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
} as const;

export const OfferKind = {
  OFFER: "offer",
  COUNTER: "counter",
  ACCEPT: "accept",
  REJECT: "reject",
  INSTANT_BUY: "instant_buy",
} as const;

export const NegotiationEventType = {
  TIMER_STARTED: "timer_started",
  TIMER_ENDED: "timer_ended",
  USER_JOINED: "user_joined",
  USER_LEFT: "user_left",
  HAND_RAISED: "hand_raised",
  MUTE_TOGGLED: "mute_toggled",
  OFFER_MADE: "offer_made",
  OFFER_ACCEPTED: "offer_accepted",
  OFFER_DECLINED: "offer_declined",
  SCREENSHOT_SHARED: "screenshot_shared",
} as const;

// Messaging
export const ConversationType = {
  DIRECT: "direct",
  SUPPORT: "support",
  SESSION_SIDECHAT: "session_sidechat",
} as const;

export const MessageType = {
  TEXT: "text",
  VOICE: "voice",
  IMAGE: "image",
  PRODUCT_SHARE: "product_share",
  SYSTEM: "system",
} as const;

export const MessageReceiptStatus = {
  SENT: "sent",
  DELIVERED: "delivered",
  SEEN: "seen",
  READ: "read",
} as const;

export const AttachmentType = {
  SCREENSHOT: "screenshot",
  IMAGE: "image",
  VIDEO: "video",
  DOCUMENT: "document",
} as const;

// Commerce
export const OrderStatus = {
  PENDING_PAYMENT: "pending_payment",
  PAID: "paid",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
} as const;

export const PaymentProvider = {
  STRIPE: "stripe",
  PAYSTACK: "paystack",
} as const;

export const PaymentStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  REFUNDED: "refunded",
} as const;

export const DeliveryMode = {
  SHIPPING: "shipping",
  PICKUP: "pickup",
  DIGITAL: "digital",
} as const;

export const ShipmentStatus = {
  PENDING: "pending",
  SHIPPED: "shipped",
  IN_TRANSIT: "in_transit",
  DELIVERED: "delivered",
  FAILED: "failed",
} as const;

export const PayoutStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

// Trust and safety
export const VerificationType = {
  IDENTITY: "identity",
  BUSINESS: "business",
  PHONE: "phone",
  EMAIL: "email",
} as const;

export const VerificationStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  EXPIRED: "expired",
} as const;

export const SellerVerificationStatus = {
  UNVERIFIED: "unverified",
  VERIFIED: "verified",
  SUSPENDED: "suspended",
} as const;

export const ReportReason = {
  FRAUD: "fraud",
  HARASSMENT: "harassment",
  INAPPROPRIATE_CONTENT: "inappropriate_content",
  FAKE_LISTING: "fake_listing",
  NON_PAYMENT: "non_payment",
  SCAM: "scam",
  OTHER: "other",
} as const;

export const ReportStatus = {
  OPEN: "open",
  IN_REVIEW: "in_review",
  RESOLVED: "resolved",
  CLOSED: "closed",
} as const;

// Notifications
export const NotificationType = {
  SESSION_REMINDER: "session_reminder",
  OFFER_RECEIVED: "offer_received",
  OFFER_ACCEPTED: "offer_accepted",
  MESSAGE_RECEIVED: "message_received",
  FOLLOWER_ALERT: "follower_alert",
  SYSTEM: "system",
} as const;

export const NotificationDeliveryChannel = {
  IN_APP: "in_app",
  PUSH: "push",
  EMAIL: "email",
  SMS: "sms",
} as const;

export const NotificationDeliveryStatus = {
  PENDING: "pending",
  SENT: "sent",
  FAILED: "failed",
  BOUNCED: "bounced",
} as const;

// Reminder status
export const ReminderStatus = {
  ACTIVE: "active",
  SENT: "sent",
  CANCELLED: "cancelled",
} as const;

// Types for type safety in application code
export type UserPrimaryRoleType =
  (typeof UserPrimaryRole)[keyof typeof UserPrimaryRole];
export type UserStatusType = (typeof UserStatus)[keyof typeof UserStatus];
export type AuthProviderType = (typeof AuthProvider)[keyof typeof AuthProvider];
export type OTPChannelType = (typeof OTPChannel)[keyof typeof OTPChannel];
export type OTPPurposeType = (typeof OTPPurpose)[keyof typeof OTPPurpose];
export type ListingTypeType = (typeof ListingType)[keyof typeof ListingType];
export type ListingStatusType =
  (typeof ListingStatus)[keyof typeof ListingStatus];
export type LiveSessionStatusType =
  (typeof LiveSessionStatus)[keyof typeof LiveSessionStatus];
export type OfferKindType = (typeof OfferKind)[keyof typeof OfferKind];
export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];
