# haggle

A new Flutter project.

HAGGLE - Marketplace Negotiation Platform
Project Overview
Haggle is a mobile platform that transforms traditional e-commerce into live, interactive negotiation experiences. Buyers and sellers connect through real-time video and voice to haggle prices dynamically, recreating the authentic marketplace experience in the digital space.

Core Philosophy: "Where every product has a conversation and every price tells a story"

Product Vision
What Problem Does Haggle Solve?
For Buyers: Fixed prices feel impersonal and non-negotiable. Haggle brings back the excitement of finding a deal through genuine human interaction.

For Sellers: Traditional platforms don't showcase product value effectively. Haggle allows sellers to demonstrate value in real-time and build customer relationships.

For Everyone: E-commerce has lost human connection. Haggle restores it through voice, video, and real-time negotiation.

Key Differentiators
Live Video + Voice Negotiation - Not just chat; real human conversation

Time-Bound Sessions - Creates urgency and excitement

Bargaining Structure - Gamified negotiation with psychological triggers

Dual User Paths - Optimized experiences for both buyers and sellers

Architecture Overview

Tech Stack Recommendations

Frontend: React Native / Flutter (Cross-platform mobile)
Backend: Node.js + Express / Python FastAPI
Real-time: WebRTC (Voice/Video), WebSockets (Live updates)
Database: PostgreSQL (User data), Redis (Session caching)
Storage: AWS S3 / Cloudinary (Images/Videos)
Push Notifications: Firebase Cloud Messaging
Authentication: OAuth 2.0 + Phone verification

Core System Components

┌─────────────────────────────────────────────────────────┐
│ Haggle System │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │ Live Feed │ │ WebRTC │ │ Payment │ │
│ │ Engine │ │ Server │ │ Processor │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │ Haggle │ │ User │ │ Notification│ │
│ │ Session │ │ Service │ │ Engine │ │
│ │ Manager │ │ │ │ │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────┘

User Flows
Flow 1: Immediate Immersion (No Traditional Onboarding)
Launch Sequence:

Splash screen (2 seconds max)

Auto-playing haggle feed begins immediately

First-time users see subtle contextual tooltips

App learns user behavior to personalize later prompts

First Session Experience:

User taps on a live haggle

Voice connection is one-tap

Clear visual indicators show negotiation flow

After 3 interactions, app prompts for role preference

Flow 2: Buyer Journey

┌─────────────────────────────────────────────────────────────┐
│ BUYER FLOW DIAGRAM │
├─────────────────────────────────────────────────────────────┤
│ │
│ OPEN APP → LIVE FEED → WATCH HAGGLE → JOIN SESSION │
│ ↓ ↓ │
│ [PERSONALIZATION] ONE-TAP VOICE CONNECT │
│ ↓ ↓ │
│ SAVE PREFERENCES VIEW PRODUCT DETAILS │
│ ↓ ↓ │
│ FOLLOW VENDORS MAKE FIRST OFFER │
│ ↓ │
│ RECEIVE COUNTEROFFER │
│ ↓ │
│ NEGOTIATION LOOP │
│ (with time pressure) │
│ ↓ │
│ ┌─────────────┴─────────────┐ │
│ ↓ ↓ │
│ DEAL REACHED NO DEAL │
│ ↓ ↓ │
│ PAYMENT FLOW SAVE FOR LATER │
│ ↓ ↓ │
│ SHIPPING/PICKUP FOLLOW VENDOR │
│ ↓ │
│ RATE EXPERIENCE │
│ │
└─────────────────────────────────────────────────────────────┘

Flow 3: Seller/Vendor Journey

┌─────────────────────────────────────────────────────────────┐
│ SELLER FLOW DIAGRAM │
├─────────────────────────────────────────────────────────────┤
│ │
│ OPEN APP → VENDOR DASHBOARD → CREATE SESSION │
│ ↓ ↓ │
│ VIEW STATISTICS SELECT CAMERA SOURCE │
│ ↓ (live/pre-recorded/images) │
│ MANAGE FOLLOWERS ↓ │
│ ↓ SET PRICE PARAMETERS │
│ REVIEW PAST SALES - Starting price │
│ ↓ - Reserve price │
│ - Instant buy (optional) │
│ ↓ │
│ SELECT ROOM ATMOSPHERE │
│ (Marketplace/Boutique/Garage │
│ Sale/Auction/Workshop) │
│ ↓ │
│ SET HAGGLE PARAMETERS │
│ - Auto-accept threshold │
│ - Auto-decline threshold │
│ - Response time limits │
│ - Max counteroffers │
│ ↓ │
│ SCHEDULE SESSION │
│ (15/30/60 min options) │
│ ↓ │
│ PROMOTE SESSION │
│ - Notify followers │
│ - Share to social │
│ - Sneak peek preview │
│ ↓ │
│ GO LIVE │
│ ↓ │
│ MANAGE OFFERS │
│ - Accept/Decline/Counter │
│ - Voice with buyers │
│ - Monitor analytics │
│ ↓ │
│ SESSION ENDS │
│ - Review offers │
│ - Finalize deals │
│ - Rate buyers │
│ │
└─────────────────────────────────────────────────────────────┘

Feature Specifications

1. Live Haggle Feed
   Purpose: Discoverability and immediate engagement

Technical Requirements:

Vertical scrolling (TikTok-style) with infinite scroll

Auto-play video previews with mute by default

WebSocket connection for real-time updates

Lazy loading for performance

Data Structure:
interface HaggleSession {
id: string
vendorId: string
productId: string
status: 'scheduled' | 'live' | 'ended'
startTime: timestamp
endTime: timestamp
currentViewers: number
thumbnailUrl: string
startingPrice: number
currentHighestOffer?: number
sessionType: 'flash' | 'standard' | 'premier'
}

UI Components:

Session card with timer, price, viewer count

Floating category filter

"Trending" and "Ending Soon" sections

Vendor profile preview

2. Voice Communication System
   Purpose: Natural, real-time negotiation

Technical Implementation:

WebRTC for peer-to-peer or SFU-based voice

One-tap connection (like a phone call)

Background noise suppression

Voice activity indicators

Optional voice privacy filters

Connection Flow:

User joins session

WebRTC offer/answer negotiation

ICE candidate exchange

Media stream established

Real-time audio transmission

Session state sync via WebSockets

UI Components:

Large mic button (toggle mute)

Voice wave visualization

Speaker indicators showing who's active

Quick text fallback option

3. Bargaining Interface
   Purpose: Visual, gamified negotiation experience

Core Logic:

interface NegotiationState {
currentOffer: number
lastCounteroffer: number
offerHistory: Offer[]
timeRemaining: number
zone: 'red' | 'yellow' | 'green'
isActive: boolean
}

// Haggle Ladder Rules
const responseTimeWindow = 120 // seconds
const maxCounteroffers = 5
const zoneThresholds = {
red: 0.3, // within 30% of target
yellow: 0.6, // within 60% of target  
 green: 0.9 // within 90% of target
}

UI Components:

Price visualization with dynamic updates

Zone indicator (progress bar)

Quick action buttons (+5, +10, +15, Match Halfway)

Offer history timeline

Vendor/buyer response timer

4. Seller Dashboard
   Purpose: Session management and analytics

Key Features:

Session scheduling calendar

Live session controls (extend, end early)

Offer management interface

Real-time analytics (viewers, offers, conversion)

Post-session review and ratings

Revenue tracking

5. Room Atmospheres
   Purpose: Contextual negotiation environments

Available Rooms:

Room Type Vibe Voice Style Background
Marketplace Energetic, competitive Fast-paced, playful Bustling market sounds
Boutique Elegant, refined Calm, professional Soft ambient music
Garage Sale Casual, friendly Relaxed, conversational Suburban background
Auction House Formal, exciting Authoritative, dramatic Auctioneer ambiance
Workshop Artisan, authentic Knowledgeable, detailed Studio/tool sounds 6. Trust & Safety System
Components:

Vendor verification (ID, business license, phone)

Buyer/Seller ratings after each transaction

Dispute resolution workflow

Haggle history recording for disputes

Flag/report system

Block user functionality

Payment escrow protection

Backend Schema Blueprint (Drizzle ORM + Neon)

This app needs more than a small `users / sessions / offers` schema if it is going to support:

- authentication by phone or email
- buyer and seller profiles
- products and services
- scheduled and live negotiation rooms
- reminders and follows
- direct messaging and in-room chat
- offer/counter-offer flows
- accepted deals, checkout, shipping, and payouts
- ratings, reports, and verification

Recommended backend layout:

```txt
src/
  db/
    schema/
      auth.ts
      users.ts
      catalog.ts
      sessions.ts
      negotiation.ts
      messaging.ts
      commerce.ts
      trust.ts
      notifications.ts
    relations.ts
```

Design Principles

1. Keep transactional tables normalized.
2. Keep feed-critical reads denormalized with cached counters.
3. Separate catalog data from live-session data.
4. Model negotiation as its own domain, not just "messages with prices".
5. Prefer UUID primary keys, `created_at`, `updated_at`, and narrow enums on all high-volume tables.
6. Add composite indexes around the exact feed, reminder, chat, and offer queries the app will make most often.

Recommended Core Tables

1. Identity and authentication

`users`

- Purpose: root account record used by every other table.
- Key columns:
  - `id`
  - `primary_role` (`buyer`, `seller`, `both`)
  - `status` (`active`, `suspended`, `deleted`)
  - `last_active_at`
  - `created_at`
  - `updated_at`

`auth_identities`

- Purpose: supports phone login, email login, and future OAuth without polluting `users`.
- Key columns:
  - `id`
  - `user_id`
  - `provider` (`phone`, `email`, `google`, `apple`)
  - `provider_uid`
  - `email`
  - `phone_e164`
  - `password_hash`
  - `is_primary`
  - `verified_at`
  - `last_used_at`
- Indexes:
  - unique on `provider + provider_uid`
  - unique on non-null `email`
  - unique on non-null `phone_e164`

`auth_otps`

- Purpose: phone verification, password reset codes, login challenges.
- Key columns:
  - `id`
  - `user_id` nullable
  - `channel` (`sms`, `email`)
  - `purpose` (`signup`, `login`, `reset_password`, `verify_contact`)
  - `target`
  - `code_hash`
  - `expires_at`
  - `consumed_at`

`user_sessions`

- Purpose: refresh sessions, device tracking, logout everywhere, suspicious session handling.
- Key columns:
  - `id`
  - `user_id`
  - `refresh_token_hash`
  - `device_name`
  - `platform`
  - `ip_address`
  - `user_agent`
  - `expires_at`
  - `revoked_at`

2. User profile and seller identity

`user_profiles`

- Purpose: public profile data used in chat, live rooms, seller profile, and reviews.
- Key columns:
  - `user_id`
  - `full_name`
  - `username`
  - `avatar_url`
  - `bio`
  - `country_code`
  - `city`
  - `response_time_label`

`seller_profiles`

- Purpose: seller-only presentation and business information.
- Key columns:
  - `user_id`
  - `business_name`
  - `trade_mark`
  - `cover_image_url`
  - `sells_summary`
  - `verification_status`
  - `rating_avg`
  - `rating_count`
  - `follower_count`
  - `completed_sales_count`

`user_addresses`

- Purpose: shipping addresses for buyers and pickup/warehouse addresses for sellers.
- Key columns:
  - `id`
  - `user_id`
  - `label`
  - `recipient_name`
  - `phone_e164`
  - `country`
  - `state`
  - `city`
  - `line_1`
  - `line_2`
  - `postal_code`
  - `is_default`

`user_settings`

- Purpose: notification preferences, privacy, reminder defaults, negotiation preferences.
- Key columns:
  - `user_id`
  - `push_enabled`
  - `sms_enabled`
  - `email_enabled`
  - `show_online_status`
  - `preferred_currency`
  - `preferred_role`

3. Catalog: products, services, categories, media

`categories`

- Purpose: marketplace grouping for products and services.
- Key columns:
  - `id`
  - `parent_id` nullable
  - `name`
  - `slug`
  - `kind` (`product`, `service`, `both`)

`listings`

- Purpose: shared base table for anything sellable in the app.
- Key columns:
  - `id`
  - `seller_id`
  - `listing_type` (`product`, `service`)
  - `category_id`
  - `title`
  - `slug`
  - `description`
  - `price_amount`
  - `price_currency`
  - `status` (`draft`, `active`, `paused`, `archived`)
  - `is_negotiable`
  - `cover_media_id` nullable
  - `view_count`
  - `save_count`
  - `share_count`
  - `created_at`
  - `updated_at`
- Indexes:
  - `seller_id + status + created_at desc`
  - `category_id + status + created_at desc`
  - `listing_type + status`

`listing_media`

- Purpose: product images, videos, thumbnails, seller-uploaded live preview assets.
- Key columns:
  - `id`
  - `listing_id`
  - `media_type` (`image`, `video`)
  - `url`
  - `thumbnail_url`
  - `sort_order`
  - `width`
  - `height`
  - `duration_seconds`

`listing_inventory`

- Purpose: stock and availability for products.
- Key columns:
  - `listing_id`
  - `sku`
  - `quantity_available`
  - `reserved_quantity`
  - `allow_backorder`

`listing_service_meta`

- Purpose: extra service-specific metadata.
- Key columns:
  - `listing_id`
  - `service_duration_minutes`
  - `delivery_mode` (`remote`, `onsite`, `hybrid`)
  - `service_area_json`

4. Discovery, follows, saves, and reminders

`seller_follows`

- Purpose: power seller follower counts and "notify followers" flows.
- Key columns:
  - `seller_id`
  - `user_id`
  - `created_at`
- Constraint:
  - unique on `seller_id + user_id`

`saved_listings`

- Purpose: saved deals in profile and quick return flows.
- Key columns:
  - `user_id`
  - `listing_id`
  - `created_at`

`live_reminders`

- Purpose: reserved live tickets / reminders for scheduled sessions.
- Key columns:
  - `user_id`
  - `session_id`
  - `remind_at`
  - `status` (`active`, `sent`, `cancelled`)
  - `created_at`
- Constraint:
  - unique on `user_id + session_id`

`feed_impressions`

- Purpose: ranking, personalization, and analytics.
- Key columns:
  - `id`
  - `user_id` nullable
  - `session_id` nullable
  - `listing_id` nullable
  - `impression_type` (`view`, `tap`, `watch`, `share`, `save`)
  - `watch_ms`
  - `created_at`

5. Live negotiation sessions

`live_sessions`

- Purpose: scheduled/live room entity shown in feed and seller dashboards.
- Key columns:
  - `id`
  - `seller_id`
  - `primary_listing_id` nullable
  - `title`
  - `description`
  - `status` (`draft`, `scheduled`, `live`, `ended`, `cancelled`)
  - `session_type` (`flash`, `standard`, `premier`)
  - `room_atmosphere` (`marketplace`, `boutique`, `garage_sale`, `auction_house`, `workshop`)
  - `scheduled_start_at`
  - `actual_start_at`
  - `actual_end_at`
  - `starting_price_amount`
  - `reserve_price_amount`
  - `instant_buy_price_amount` nullable
  - `min_increment_amount`
  - `auto_accept_threshold_amount` nullable
  - `auto_decline_threshold_amount` nullable
  - `response_time_limit_seconds`
  - `max_counteroffers`
  - `viewer_count_cached`
  - `offer_count_cached`
  - `accepted_offer_id` nullable
  - `thumbnail_url`
  - `stream_playback_url`
  - `created_at`
  - `updated_at`
- Indexes:
  - `status + scheduled_start_at`
  - `status + actual_start_at`
  - `seller_id + status + scheduled_start_at`

`live_session_listings`

- Purpose: allows one live session to feature one or many products/services.
- Key columns:
  - `session_id`
  - `listing_id`
  - `sort_order`
  - `is_primary`

`live_session_participants`

- Purpose: room membership, hand raise state, mute state, and accepted buyer list.
- Key columns:
  - `id`
  - `session_id`
  - `user_id`
  - `role` (`seller`, `buyer`, `viewer`, `moderator`)
  - `join_source` (`feed`, `profile`, `reminder`, `share_link`)
  - `joined_at`
  - `left_at`
  - `is_muted`
  - `hand_raised`
  - `is_active`
- Constraint:
  - unique on `session_id + user_id`

`live_session_media_assets`

- Purpose: session-specific previews, posters, and demo video sources separate from listing media.
- Key columns:
  - `id`
  - `session_id`
  - `asset_type` (`poster`, `preview_clip`, `stream_source`, `gallery`)
  - `url`
  - `metadata_json`

`webrtc_peers`

- Purpose: store transient metadata when needed for signaling audit and reconnect support.
- Key columns:
  - `id`
  - `session_id`
  - `user_id`
  - `connection_role`
  - `peer_state`
  - `last_heartbeat_at`
- Note:
  - actual ICE exchange should still happen through websocket/pubsub, not heavy relational polling.

6. Negotiation and offer engine

`negotiation_threads`

- Purpose: each buyer gets a negotiation lane inside a live room or direct listing negotiation.
- Key columns:
  - `id`
  - `session_id` nullable
  - `listing_id` nullable
  - `buyer_id`
  - `seller_id`
  - `status` (`active`, `accepted`, `rejected`, `expired`, `cancelled`)
  - `current_offer_amount`
  - `last_offer_at`
  - `expires_at`
  - `accepted_offer_id` nullable
  - `created_at`
- Indexes:
  - `seller_id + status + last_offer_at desc`
  - `buyer_id + status + last_offer_at desc`
  - unique partial strategy for active buyer/session pair when desired

`offers`

- Purpose: immutable price actions inside a negotiation thread.
- Key columns:
  - `id`
  - `thread_id`
  - `session_id` nullable
  - `listing_id` nullable
  - `sender_user_id`
  - `offer_kind` (`offer`, `counter`, `accept`, `reject`, `instant_buy`)
  - `amount`
  - `currency`
  - `sequence_no`
  - `parent_offer_id` nullable
  - `expires_at` nullable
  - `created_at`
- Indexes:
  - `thread_id + sequence_no`
  - `session_id + created_at`

`negotiation_events`

- Purpose: append-only audit trail for timers, joins, unmute actions, accepts, declines, screenshots shared, etc.
- Key columns:
  - `id`
  - `thread_id` nullable
  - `session_id`
  - `actor_user_id` nullable
  - `event_type`
  - `payload_json`
  - `created_at`

This separation is important:

- `offers` are financial state changes.
- `negotiation_events` are behavioral/audit events.

7. Messaging and shared media

`conversations`

- Purpose: buyer-seller direct chat outside the live room, plus fallback negotiation chat.
- Key columns:
  - `id`
  - `conversation_type` (`direct`, `support`, `session_sidechat`)
  - `seller_id` nullable
  - `listing_id` nullable
  - `session_id` nullable
  - `last_message_at`
  - `last_message_preview`
  - `created_at`
- Indexes:
  - `last_message_at desc`

`conversation_participants`

- Purpose: membership and per-user conversation state.
- Key columns:
  - `conversation_id`
  - `user_id`
  - `last_read_message_id` nullable
  - `last_read_at` nullable
  - `is_archived`
  - `is_muted`

`messages`

- Purpose: text, voice note, screenshot, product share, system notices.
- Key columns:
  - `id`
  - `conversation_id`
  - `sender_user_id`
  - `message_type` (`text`, `voice`, `image`, `product_share`, `system`)
  - `text_body` nullable
  - `voice_url` nullable
  - `voice_duration_seconds` nullable
  - `shared_listing_id` nullable
  - `metadata_json`
  - `created_at`
  - `edited_at` nullable
  - `deleted_at` nullable
- Indexes:
  - `conversation_id + created_at`

`message_attachments`

- Purpose: screenshots and media attachments linked to chat messages.
- Key columns:
  - `id`
  - `message_id`
  - `attachment_type`
  - `url`
  - `thumbnail_url`
  - `size_bytes`

`message_receipts`

- Purpose: sent/delivered/seen/read states shown in chat UI.
- Key columns:
  - `message_id`
  - `user_id`
  - `status` (`sent`, `delivered`, `seen`, `read`)
  - `updated_at`

8. Commerce: checkout, deal closure, shipping, payout

`orders`

- Purpose: created only when a deal is accepted or instant buy succeeds.
- Key columns:
  - `id`
  - `buyer_id`
  - `seller_id`
  - `session_id` nullable
  - `thread_id` nullable
  - `accepted_offer_id`
  - `status` (`pending_payment`, `paid`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded`)
  - `subtotal_amount`
  - `shipping_amount`
  - `platform_fee_amount`
  - `total_amount`
  - `currency`
  - `shipping_address_id`
  - `created_at`

`order_items`

- Purpose: line items attached to the accepted deal.
- Key columns:
  - `id`
  - `order_id`
  - `listing_id`
  - `title_snapshot`
  - `quantity`
  - `unit_price_amount`
  - `total_price_amount`

`payments`

- Purpose: payment provider records and reconciliation.
- Key columns:
  - `id`
  - `order_id`
  - `provider` (`stripe`, `paystack`, etc.)
  - `provider_payment_id`
  - `status`
  - `amount`
  - `currency`
  - `paid_at` nullable
  - `raw_response_json`

`shipments`

- Purpose: delivery/pickup fulfillment tracking.
- Key columns:
  - `id`
  - `order_id`
  - `delivery_mode` (`shipping`, `pickup`, `digital`)
  - `carrier`
  - `tracking_number`
  - `shipped_at`
  - `delivered_at`
  - `status`

`seller_payouts`

- Purpose: release seller funds after escrow or delivery confirmation.
- Key columns:
  - `id`
  - `seller_id`
  - `order_id`
  - `amount`
  - `currency`
  - `status`
  - `released_at`

9. Ratings, trust, verification, disputes

`reviews`

- Purpose: post-transaction buyer/seller ratings.
- Key columns:
  - `id`
  - `order_id`
  - `reviewer_user_id`
  - `reviewed_user_id`
  - `rating`
  - `comment`
  - `created_at`
- Constraint:
  - one review per reviewer per order

`verification_submissions`

- Purpose: seller KYC/business verification.
- Key columns:
  - `id`
  - `user_id`
  - `verification_type` (`identity`, `business`, `phone`, `email`)
  - `status`
  - `document_urls_json`
  - `reviewed_at`
  - `reviewed_by`

`reports`

- Purpose: user reporting, content abuse, fraud flags, session incidents.
- Key columns:
  - `id`
  - `reporter_user_id`
  - `reported_user_id` nullable
  - `session_id` nullable
  - `listing_id` nullable
  - `message_id` nullable
  - `reason`
  - `details`
  - `status`
  - `created_at`

`blocks`

- Purpose: hard user-level blocking for chat and session safety.
- Key columns:
  - `blocker_user_id`
  - `blocked_user_id`
  - `created_at`

10. Notifications

`notifications`

- Purpose: in-app notification center.
- Key columns:
  - `id`
  - `user_id`
  - `type`
  - `title`
  - `body`
  - `payload_json`
  - `read_at`
  - `created_at`
- Indexes:
  - `user_id + created_at desc`
  - `user_id + read_at`

`notification_deliveries`

- Purpose: push/email/SMS delivery audit.
- Key columns:
  - `id`
  - `notification_id`
  - `channel`
  - `provider_message_id`
  - `status`
  - `sent_at`
  - `failed_at`

High-Value Relationships

```txt
users
  -> auth_identities
  -> user_profiles
  -> seller_profiles
  -> user_addresses
  -> user_sessions
  -> seller_follows
  -> saved_listings
  -> live_reminders

seller_profiles
  -> listings
  -> live_sessions
  -> reviews

listings
  -> listing_media
  -> listing_inventory
  -> live_session_listings
  -> saved_listings

live_sessions
  -> live_session_listings
  -> live_session_participants
  -> negotiation_threads
  -> negotiation_events
  -> conversations

negotiation_threads
  -> offers
  -> orders

conversations
  -> conversation_participants
  -> messages
  -> message_receipts

orders
  -> order_items
  -> payments
  -> shipments
  -> reviews
  -> seller_payouts
```

How the Main App Features Map to the Schema

`Authentication`

- Login/signup by phone or email uses `users`, `auth_identities`, `auth_otps`, and `user_sessions`.

`Seller profile page`

- Pull from `user_profiles`, `seller_profiles`, `seller_follows`, `listings`, and `live_sessions`.

`Market/product/service detail`

- Pull from `listings`, `listing_media`, `categories`, and seller profile joins.

`Live feed`

- Pull from `live_sessions` joined with seller profile and primary listing.
- Avoid expensive aggregate queries at request time by caching `viewer_count_cached`, `offer_count_cached`, `follower_count`, and `rating_avg`.

`Join negotiation room`

- Create/update `live_session_participants`.
- Stream realtime state from websocket memory/Redis, but persist durable events to `negotiation_events`.

`Offers and counter-offers`

- Use `negotiation_threads` + immutable `offers`.
- Accepted offer creates `orders` and locks thread/session outcome.

`Messages`

- Use `conversations`, `conversation_participants`, `messages`, `message_attachments`, and `message_receipts`.

`Saved deals and reminders`

- Use `saved_listings` and `live_reminders`.

`Analytics dashboard`

- Start with cached counts on `seller_profiles`, `listings`, and `live_sessions`.
- Add warehouse/event pipelines later if deeper analytics is needed.

Performance Notes for Faster API Calls

1. Keep feed reads shallow.
   - Feed endpoint should read from `live_sessions` + seller snapshot fields + primary listing thumbnail, not from a deep graph every time.

2. Cache counters on hot tables.
   - Examples: `viewer_count_cached`, `offer_count_cached`, `follower_count`, `rating_avg`, `completed_sales_count`.

3. Use composite indexes around sorted list endpoints.
   - `live_sessions(status, scheduled_start_at desc)`
   - `messages(conversation_id, created_at desc)`
   - `offers(thread_id, sequence_no desc)`
   - `notifications(user_id, created_at desc)`

4. Keep large blobs out of core rows.
   - Store media in object storage; keep only metadata and URLs in Postgres.

5. Snapshot where it saves joins.
   - `orders` and `order_items` should store title/price snapshots so historical records do not depend on mutable listing rows.

6. Use idempotency for writes that can be retried.
   - Offer creation, checkout creation, payout release, and notification fanout.

7. Separate durable DB writes from realtime fanout.
   - Neon/Postgres stores truth.
   - WebSocket/Redis handles low-latency room presence and signaling.

Suggested Drizzle Implementation Notes

- Put enums in a shared file so all tables reuse the same source of truth.
- Define relations explicitly with `relations(...)`.
- Keep timestamps as `timestamp(..., { withTimezone: true })`.
- Use `numeric` for money if you want exactness, or store in minor units as integers (`amount_kobo`, `amount_cents`) for simpler arithmetic.
- Create dedicated query functions for:
  - live feed
  - seller profile aggregate
  - conversation list
  - conversation messages
  - active negotiation thread
  - seller analytics summary

Recommended First Migration Order

1. `users`, `auth_identities`, `auth_otps`, `user_sessions`
2. `user_profiles`, `seller_profiles`, `user_addresses`, `user_settings`
3. `categories`, `listings`, `listing_media`, `listing_inventory`, `listing_service_meta`
4. `seller_follows`, `saved_listings`, `live_reminders`
5. `live_sessions`, `live_session_listings`, `live_session_participants`
6. `negotiation_threads`, `offers`, `negotiation_events`
7. `conversations`, `conversation_participants`, `messages`, `message_attachments`, `message_receipts`
8. `orders`, `order_items`, `payments`, `shipments`, `seller_payouts`
9. `reviews`, `verification_submissions`, `reports`, `blocks`
10. `notifications`, `notification_deliveries`

If implemented this way, the backend remains cleanly split into:

- identity
- marketplace catalog
- live session engine
- negotiation engine
- messaging
- commerce
- trust and safety
- notifications

That structure will scale much better than trying to make one `sessions` table or one `messages` table carry the whole app.

API Endpoints (Key Examples)
Session Management

GET /api/sessions/feed - Get live sessions feed
GET /api/sessions/:id - Get session details
POST /api/sessions - Create new session
PUT /api/sessions/:id/start - Start session
PUT /api/sessions/:id/end - End session
POST /api/sessions/:id/join - Join session

Negotiation

POST /api/sessions/:id/offers - Make an offer
PUT /api/offers/:id/accept - Accept offer
PUT /api/offers/:id/counter - Counter offer
PUT /api/offers/:id/reject - Reject offer
GET /api/sessions/:id/history - Get negotiation history

User Management

GET /api/users/me - Get current user
PUT /api/users/me - Update profile
GET /api/users/:id/ratings - Get user ratings
POST /api/users/:id/follow - Follow vendor

Voice/WebRTC

POST /api/webrtc/offer - Create WebRTC offer
POST /api/webrtc/answer - Submit WebRTC answer
POST /api/webrtc/ice-candidate - Submit ICE candidate

UI/UX Guidelines
Color Palette

Primary: #F44D24 (Warm Orange)
Secondary: #6B4EFF (Deep Purple)
Accent: #FFEEE6 (Golden Amber)
Success: #4CAF50 (Green)
Warning: #FFC107 (Yellow)
Danger: #FF5252 (Red)
Neutral: #F3F3F5 (Light Gray)
Dark: #2C2C2C (Charcoal)

Typography:

Headings: SF Pro Display / Inter Bold
Body: SF Pro Text / Inter Regular
Prices: SF Mono / JetBrains Mono

Animation Principles
Micro-interactions: 200-300ms ease-out

Page transitions: 300-400ms ease-in-out

Voice waves: Pulsing animation on active speaker

Price changes: Gentle bounce with haptic feedback

Deal celebrations: Confetti animation with device vibration

Contextual Education System
No traditional onboarding. Instead:

Trigger Tooltip/Education
First feed open "👆 Swipe up for more haggles" (3 sec, then fades)
First session join "🎤 Tap mic to speak with vendor"
Watching 30 sec without offer "💡 Pro tip: Vendors respect confident first offers"
First offer made "🎯 Good start! Try within 15% of asking"
Counteroffer received "⚡ You have 2 minutes to respond"
Deal reached "🎉 Deal! Rate your experience"
After 3 sessions "🏆 You're a Natural Haggle! Want advanced tips?"
Success Metrics
Launch KPIs
Session duration > 3 minutes

Offer-to-accept rate > 20%

Voice connection rate > 60%

Day 7 retention > 30%

Growth Metrics
Successful haggles per user/week

Vendor session completion rate

Repeat buyer rate

Referral rate

Development Phases
Phase 1: MVP (Minimum Viable Product)
✅ Live feed browsing

✅ Create/join haggle sessions

✅ Voice communication

✅ Basic offer/counteroffer

✅ User profiles

✅ Payment integration

✅ Ratings system

Phase 2: Enhanced Features
⬜ Room atmospheres

⬜ Scheduled sessions

⬜ Seller analytics

⬜ Push notifications

⬜ Social sharing

⬜ Vendor verification badges

Phase 3: Scaling & Community
⬜ Collaborative haggling (group buying)

⬜ Vendor subscription tiers

⬜ Advanced discovery algorithms

⬜ Live streaming features

⬜ International expansion

Getting Started for Development
Prerequisites

Node.js v18+
PostgreSQL 14+
Redis 7+
WebRTC-compatible browser/environment

Initial Setup

# Clone repository

git clone [repository-url]

# Install dependencies

npm install

# Set up environment variables

cp .env.example .env

# Initialize database

npm run migrate

# Start development server

npm run dev

Environment Variables

DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
WEBRTC_STUN_SERVER=stun:stun.l.google.com:19302
CLOUDINARY_CLOUD_NAME=...
STRIPE_SECRET_KEY=...

Important Design Decisions
Why No Traditional Onboarding?
Social apps succeed through immediate immersion

Haggle's value is experiential, not explainable

Contextual education reduces friction

Users learn by doing, not reading

Why Voice-First?
Voice conveys nuance text can't (tone, urgency, personality)

Faster negotiation (30 seconds voice vs 3 minutes text)

Builds human connection and trust

Differentiator from competitors

Why Time-Bound Sessions?
Creates urgency (FOMO)

Encourages faster decision-making

Gamifies the experience

Matches real marketplace energy

Troubleshooting Common Issues
Voice Connection Fails
Check WebRTC STUN/TURN server configuration

Verify microphone permissions on device

Test network connectivity (voice requires stable connection)

Live Feed Performance
Implement video lazy loading

Use CDN for thumbnails

Cache session data in Redis

Monitor WebSocket connection health

Offer Synchronization
Use optimistic UI updates with rollback

Implement idempotent offer creation

Lock session state during critical operations

Contributing Guidelines
Branch naming: feature/feature-name or fix/bug-description

Commit messages: Conventional Commits format

PR reviews required before merge

Test coverage minimum 80%

UI changes require design review

License
[Specify license]

Contact & Support
[Project contact information]

Version: 1.0.0
Last Updated: [Date]
Status: Ready for Development Phase 1
