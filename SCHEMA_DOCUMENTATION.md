# Haggle Backend Schema Documentation

## Overview

This document describes the complete Drizzle ORM schema for the Haggle marketplace negotiation platform. The schema is organized into 9 logical domains, each with a dedicated file.

## Schema Structure

```
src/db/schema/
├── enums.ts              # Centralized enum definitions
├── auth.ts               # Authentication & identity
├── users.ts              # User profiles & seller info
├── catalog.ts            # Products, services, categories
├── sessions.ts           # Live negotiation sessions
├── negotiation.ts        # Offers and negotiation threads
├── messaging.ts          # Conversations & messages
├── commerce.ts           # Orders, payments, shipments
├── trust.ts              # Reviews, verification, reports
├── notifications.ts      # In-app & push notifications
├── relations.ts          # All table relationships
└── index.ts              # Central export point
```

---

## 1. AUTHENTICATION & IDENTITY (`auth.ts`)

Handles user account creation, authentication methods, and session management.

### Tables:

**users**

- Root account record for every user
- Tracks primary role (buyer, seller, both) and status
- Fields: `id`, `primary_role`, `status`, `last_active_at`, `created_at`, `updated_at`

**authIdentities**

- Multiple auth methods per user (phone, email, Google, Apple)
- Supports phone/email verification and OAuth
- Fields: `id`, `user_id`, `provider`, `provider_uid`, `email`, `phone_e164`, `password_hash`, `is_primary`, `verified_at`, `last_used_at`
- Indexes: Unique constraints on `(provider, provider_uid)`, non-null `email`, non-null `phone_e164`

**authOtps**

- One-Time Passwords for signup, login, password reset
- Fields: `id`, `user_id`, `channel` (sms/email), `purpose`, `target`, `code_hash`, `expires_at`, `consumed_at`

**userSessions**

- Session management with refresh tokens and device tracking
- Supports logout everywhere and suspicious session detection
- Fields: `id`, `user_id`, `refresh_token_hash`, `device_name`, `platform`, `ip_address`, `user_agent`, `expires_at`, `revoked_at`

---

## 2. USER PROFILES & SELLER IDENTITY (`users.ts`)

Manages user profile data, seller business information, addresses, and preferences.

### Tables:

**userProfiles**

- Public profile shown in chat, reviews, and seller profiles
- Fields: `user_id` (PK), `display_name`, `username` (unique), `avatar_url`, `bio`, `country_code`, `city`, `response_time_label`

**sellerProfiles**

- Seller-specific information and business details
- Denormalized metrics: `rating_avg`, `rating_count`, `follower_count`, `completed_sales_count`
- Verification status tracking
- Fields: `user_id` (PK), `business_name`, `trade_mark`, `cover_image_url`, `sells_summary`, `verification_status`

**userAddresses**

- Shipping addresses for buyers, pickup addresses for sellers
- Multiple addresses per user with default tracking
- Fields: `id`, `user_id`, `label`, `recipient_name`, `phone_e164`, `country`, `state`, `city`, `line_1`, `line_2`, `postal_code`, `is_default`

**userSettings**

- Notification preferences, privacy settings, negotiation preferences
- Flexible JSON for seller-specific preferences
- Fields: `user_id` (PK), `push_enabled`, `sms_enabled`, `email_enabled`, `show_online_status`, `preferred_currency`, `preferred_role`, `seller_preferences`

---

## 3. CATALOG & MARKETPLACE (`catalog.ts`)

Products, services, categories, media, and inventory management.

### Tables:

**categories**

- Hierarchical category structure (parent-child relationships)
- Kind: product, service, or both
- Fields: `id`, `parent_id`, `name`, `slug`, `kind`

**listings**

- Core marketplace entity (products or services)
- Denormalized metrics for feed: `view_count`, `save_count`, `share_count`
- Fields: `id`, `seller_id`, `listing_type`, `category_id`, `title`, `slug`, `description`, `price_amount`, `price_currency`, `status`, `is_negotiable`, `cover_media_id`
- Indexes: Composite indexes on `(seller_id, status, created_at)`, `(category_id, status, created_at)`

**listingMedia**

- Images and videos for listings
- Supports thumbnails and video duration tracking
- Fields: `id`, `listing_id`, `media_type`, `url`, `thumbnail_url`, `sort_order`, `width`, `height`, `duration_seconds`

**listingInventory**

- Stock and availability tracking for products
- Reserve quantity for pending orders
- Fields: `listing_id` (PK), `sku`, `quantity_available`, `reserved_quantity`, `allow_backorder`

**listingServiceMeta**

- Service-specific metadata (not for products)
- Delivery modes and service areas
- Fields: `listing_id` (PK), `service_duration_minutes`, `delivery_mode`, `service_area_json`

---

## 4. LIVE NEGOTIATION SESSIONS (`sessions.ts`)

Scheduled and live negotiation rooms, participants, and discovery mechanisms.

### Tables:

**liveSessions**

- The core "haggle room" entity
- Room types: Flash, Standard, Premier
- Atmospheres: Marketplace, Boutique, Garage Sale, Auction House, Workshop
- Negotiation rules: auto-accept threshold, response time limit, max counteroffers
- Denormalized metrics: `viewer_count_cached`, `offer_count_cached`
- Fields: `id`, `seller_id`, `primary_listing_id`, `title`, `description`, `status`, `session_type`, `room_atmosphere`, `scheduled_start_at`, `actual_start_at`, `actual_end_at`, `starting_price_amount`, `reserve_price_amount`, `instant_buy_price_amount`, negotiation parameters...
- Indexes: Composite indexes on `(status, scheduled_start_at)`, `(seller_id, status, scheduled_start_at)`

**liveSessionListings**

- Links one or more products/services to a session
- Fields: `session_id`, `listing_id`, `sort_order`, `is_primary`
- Unique constraint on `(session_id, listing_id)`

**liveSessionParticipants**

- Room membership and participation state
- Tracks join source, mute state, hand raise
- Fields: `id`, `session_id`, `user_id`, `role` (seller/buyer/viewer/moderator), `join_source`, `joined_at`, `left_at`, `is_muted`, `hand_raised`, `is_active`
- Unique constraint on `(session_id, user_id)`

**liveSessionMediaAssets**

- Session-specific media (posters, preview clips, stream sources)
- Separate from listing media for session-specific customization
- Fields: `id`, `session_id`, `asset_type`, `url`, `metadata_json`

**webrtcPeers**

- Transient WebRTC connection metadata
- For signaling audit and reconnect support
- Fields: `id`, `session_id`, `user_id`, `connection_role`, `peer_state`, `last_heartbeat_at`

**sellerFollows**

- Follower relationships for sellers
- Powers follower counts and "notify followers" flows
- Fields: `seller_id`, `user_id`, `created_at`
- Unique constraint on `(seller_id, user_id)`

**savedListings**

- Bookmarked deals for quick return flows
- Fields: `user_id`, `listing_id`, `created_at`
- Unique constraint on `(user_id, listing_id)`

**liveReminders**

- Pre-session reminders and reserved tickets
- Users get notified before a session goes live
- Fields: `user_id`, `session_id`, `remind_at`, `status`, `created_at`
- Unique constraint on `(user_id, session_id)`

**feedImpressions**

- Analytics for ranking, personalization, and feed optimization
- Tracks view, tap, watch, share, save interactions
- Fields: `id`, `user_id`, `session_id`, `listing_id`, `impression_type`, `watch_ms`, `created_at`

---

## 5. NEGOTIATION & OFFER ENGINE (`negotiation.ts`)

Handles the negotiation logic, offers/counter-offers, and negotiation audit trails.

### Tables:

**negotiationThreads**

- Each buyer gets a negotiation lane in a live room or direct listing
- Models the conversation around a specific offer between buyer and seller
- Tracks current offer state and expiration
- Fields: `id`, `session_id`, `listing_id`, `buyer_id`, `seller_id`, `status`, `current_offer_amount`, `last_offer_at`, `expires_at`, `accepted_offer_id`
- Indexes: Composite indexes on `(seller_id, status, last_offer_at)`, `(buyer_id, status, last_offer_at)`

**offers**

- Immutable price actions (offers, counter-offers, accepts, rejects)
- Forms complete audit trail of negotiation with sequence numbers
- Fields: `id`, `thread_id`, `session_id`, `listing_id`, `sender_user_id`, `offer_kind`, `amount`, `currency`, `sequence_no`, `parent_offer_id`, `expires_at`
- Indexes: Composite on `(thread_id, sequence_no)`, `(session_id, created_at)`

**negotiationEvents**

- Append-only audit trail of behavioral events
- Separate from offers to distinguish user actions from financial events
- Events: timer started/ended, user joined/left, hand raised, mute toggled, offers made/accepted/declined, screenshot shared
- Fields: `id`, `thread_id`, `session_id`, `actor_user_id`, `event_type`, `payload_json`
- Indexes: Composite on `(thread_id, created_at)`, `(session_id, created_at)`

---

## 6. MESSAGING & COMMUNICATION (`messaging.ts`)

Direct messaging between buyers and sellers, with flexible message types and delivery tracking.

### Tables:

**conversations**

- Chat threads between users
- Types: Direct, Support, Session SideChat
- Fields: `id`, `conversation_type`, `seller_id`, `listing_id`, `session_id`, `last_message_at`, `last_message_preview`

**conversationParticipants**

- Membership and per-user conversation state
- Tracks read status and user preferences
- Fields: `conversation_id`, `user_id`, `last_read_message_id`, `last_read_at`, `is_archived`, `is_muted`
- Unique constraint on `(conversation_id, user_id)`

**messages**

- Text, voice notes, images, product shares, system messages
- Supports soft deletes (deleted_at) for audit trails
- Fields: `id`, `conversation_id`, `sender_user_id`, `message_type`, `text_body`, `voice_url`, `voice_duration_seconds`, `shared_listing_id`, `metadata_json`, `created_at`, `edited_at`, `deleted_at`

**messageAttachments**

- Screenshots and media attachments linked to messages
- Fields: `id`, `message_id`, `attachment_type`, `url`, `thumbnail_url`, `size_bytes`

**messageReceipts**

- Sent/delivered/seen/read states for messages
- Granular tracking per user
- Fields: `message_id`, `user_id`, `status`, `updated_at`
- Unique constraint on `(message_id, user_id)`

---

## 7. COMMERCE & ORDER MANAGEMENT (`commerce.ts`)

Orders, payments, shipments, and seller payouts.

### Tables:

**orders**

- Created only when deal is accepted or instant buy succeeds
- Represents finalized transaction between buyer and seller
- Fields: `id`, `buyer_id`, `seller_id`, `session_id`, `thread_id`, `accepted_offer_id`, `status`, `subtotal_amount`, `shipping_amount`, `platform_fee_amount`, `total_amount`, `currency`, `shipping_address_id`
- Statuses: pending_payment, paid, processing, shipped, delivered, cancelled, refunded
- Indexes: Composite on `(buyer_id, status, created_at)`, `(seller_id, status, created_at)`

**orderItems**

- Line items in an order
- Stores title/price snapshots so historical records don't depend on mutable listings
- Fields: `id`, `order_id`, `listing_id`, `title_snapshot`, `quantity`, `unit_price_amount`, `total_price_amount`

**payments**

- Payment provider records (Stripe, Paystack, etc.)
- Stores raw provider responses for debugging
- Fields: `id`, `order_id`, `provider`, `provider_payment_id`, `status`, `amount`, `currency`, `paid_at`, `raw_response_json`

**shipments**

- Delivery/pickup fulfillment tracking
- Fields: `id`, `order_id`, `delivery_mode` (shipping/pickup/digital), `carrier`, `tracking_number`, `shipped_at`, `delivered_at`, `status`

**sellerPayouts**

- Release seller funds after order completion
- Fields: `id`, `seller_id`, `order_id`, `amount`, `currency`, `status`, `released_at`
- Statuses: pending, processing, completed, failed

---

## 8. TRUST, SAFETY & VERIFICATION (`trust.ts`)

Ratings, verification, reports, and safety enforcement.

### Tables:

**reviews**

- Post-transaction ratings and comments from buyers/sellers
- Fields: `id`, `order_id`, `reviewer_user_id`, `reviewed_user_id`, `rating` (1-5), `comment`
- Unique constraint on `(order_id, reviewer_user_id, reviewed_user_id)`

**verificationSubmissions**

- Seller KYC/business verification submissions
- Types: identity, business, phone, email
- Fields: `id`, `user_id`, `verification_type`, `status`, `document_urls_json`, `reviewed_at`, `reviewed_by`, `rejection_reason`

**reports**

- User reporting, content abuse, fraud flags
- Reasons: fraud, harassment, inappropriate content, fake listing, non-payment, scam, other
- Fields: `id`, `reporter_user_id`, `reported_user_id`, `session_id`, `listing_id`, `message_id`, `reason`, `details`, `status`

**blocks**

- Hard user-level blocking for safety
- Prevents communication and interaction
- Fields: `blocker_user_id`, `blocked_user_id`, `created_at`
- Unique constraint on `(blocker_user_id, blocked_user_id)`

---

## 9. NOTIFICATIONS (`notifications.ts`)

In-app notification center and delivery tracking.

### Tables:

**notifications**

- In-app notifications shown to users
- Types: session_reminder, offer_received, offer_accepted, message_received, follower_alert, system
- Fields: `id`, `user_id`, `type`, `title`, `body`, `payload_json`, `read_at`
- Indexes: Composite on `(user_id, created_at desc)`, `(user_id, read_at)`

**notificationDeliveries**

- Push/email/SMS delivery audit
- Channels: in-app, push, email, sms
- Fields: `id`, `notification_id`, `channel`, `provider_message_id`, `status`, `sent_at`, `failed_at`

---

## Key Design Principles

1. **Normalized transactional tables**: Avoid duplication in core data
2. **Denormalized read-heavy fields**: Cache metrics on feed-critical tables for performance
3. **Immutable audit trails**: `offers`, `negotiation_events`, `reports` track all historical state
4. **Separate concerns**: Financial (`offers`) and behavioral (`negotiation_events`) events tracked independently
5. **UUID primary keys**: All tables use UUIDs for distributed generation
6. **Timezone-aware timestamps**: All timestamps stored with timezone information
7. **Composite indexes**: Strategic indexes on frequently queried patterns
8. **Soft deletes**: Messages support `deleted_at` for audit compliance
9. **Snapshot storage**: Orders store item snapshots to preserve historical state
10. **JSON flexibility**: Use JSONB for semi-structured data (metadata, settings, preferences)

---

## Usage Examples

### Import all schema and types:

```typescript
import {
  users,
  listings,
  liveSessions,
  offers,
  orders,
  // ... and all other tables and types
} from "@/db/schema";
```

### Use with Drizzle queries:

```typescript
import { db } from "@/db";
import { liveSessions, sellers } from "@/db/schema";

// Get active sessions with seller info
const sessions = await db.query.liveSessions.findMany({
  where: (sessions, { eq }) => eq(sessions.status, "live"),
  with: {
    seller: true,
    primary_listing: true,
    participants: true,
  },
});
```

---

## Migration Order (Recommended)

1. Authentication: `users`, `authIdentities`, `authOtps`, `userSessions`
2. Profiles: `userProfiles`, `sellerProfiles`, `userAddresses`, `userSettings`
3. Catalog: `categories`, `listings`, `listingMedia`, `listingInventory`, `listingServiceMeta`
4. Discovery: `sellerFollows`, `savedListings`, `liveReminders`, `feedImpressions`
5. Sessions: `liveSessions`, `liveSessionListings`, `liveSessionParticipants`, `liveSessionMediaAssets`, `webrtcPeers`
6. Negotiation: `negotiationThreads`, `offers`, `negotiationEvents`
7. Messaging: `conversations`, `conversationParticipants`, `messages`, `messageAttachments`, `messageReceipts`
8. Commerce: `orders`, `orderItems`, `payments`, `shipments`, `sellerPayouts`
9. Trust: `reviews`, `verificationSubmissions`, `reports`, `blocks`
10. Notifications: `notifications`, `notificationDeliveries`

---

## Performance Optimization Tips

- Use indexes on frequently queried columns
- Cache counters on denormalized fields (update via triggers or application logic)
- Keep large blobs (media) out of core rows; store only URLs
- Use composite indexes matching query patterns exactly
- Consider partitioning high-volume tables by date (e.g., offers, messages)
- Query only needed fields; avoid selecting \* when possible
