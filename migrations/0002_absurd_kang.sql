CREATE TABLE "auth_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_uid" text NOT NULL,
	"email" text,
	"phone_e164" text,
	"password_hash" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"channel" text NOT NULL,
	"purpose" text NOT NULL,
	"target" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"blocker_user_id" uuid NOT NULL,
	"blocked_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"kind" text DEFAULT 'both' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"last_read_message_id" uuid,
	"last_read_at" timestamp with time zone,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_muted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_type" text NOT NULL,
	"seller_id" uuid,
	"listing_id" uuid,
	"session_id" uuid,
	"last_message_at" timestamp with time zone,
	"last_message_preview" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feed_impressions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"session_id" uuid,
	"listing_id" uuid,
	"impression_type" text NOT NULL,
	"watch_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_inventory" (
	"listing_id" uuid PRIMARY KEY NOT NULL,
	"sku" text,
	"quantity_available" integer DEFAULT 1 NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"allow_backorder" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"media_type" text NOT NULL,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"width" integer,
	"height" integer,
	"duration_seconds" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_service_meta" (
	"listing_id" uuid PRIMARY KEY NOT NULL,
	"service_duration_minutes" integer,
	"delivery_mode" text NOT NULL,
	"service_area_json" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"listing_type" text NOT NULL,
	"category_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"price_amount" numeric(12, 2) NOT NULL,
	"price_currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_negotiable" boolean DEFAULT true NOT NULL,
	"cover_media_id" uuid,
	"view_count" integer DEFAULT 0 NOT NULL,
	"save_count" integer DEFAULT 0 NOT NULL,
	"share_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_reminders" (
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"remind_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_session_listings" (
	"session_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_session_media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"asset_type" text NOT NULL,
	"url" text NOT NULL,
	"metadata_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_session_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"join_source" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	"is_muted" boolean DEFAULT false NOT NULL,
	"hand_raised" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"primary_listing_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"session_type" text NOT NULL,
	"room_atmosphere" text NOT NULL,
	"scheduled_start_at" timestamp with time zone NOT NULL,
	"actual_start_at" timestamp with time zone,
	"actual_end_at" timestamp with time zone,
	"starting_price_amount" numeric(12, 2) NOT NULL,
	"reserve_price_amount" numeric(12, 2),
	"instant_buy_price_amount" numeric(12, 2),
	"min_increment_amount" numeric(12, 2) NOT NULL,
	"auto_accept_threshold_amount" numeric(12, 2),
	"auto_decline_threshold_amount" numeric(12, 2),
	"response_time_limit_seconds" integer DEFAULT 120 NOT NULL,
	"max_counteroffers" integer DEFAULT 5 NOT NULL,
	"viewer_count_cached" integer DEFAULT 0 NOT NULL,
	"offer_count_cached" integer DEFAULT 0 NOT NULL,
	"accepted_offer_id" uuid,
	"thumbnail_url" text,
	"stream_playback_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"attachment_type" text NOT NULL,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"size_bytes" integer
);
--> statement-breakpoint
CREATE TABLE "message_receipts" (
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_user_id" uuid NOT NULL,
	"message_type" text NOT NULL,
	"text_body" text,
	"voice_url" text,
	"voice_duration_seconds" integer,
	"shared_listing_id" uuid,
	"metadata_json" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "negotiation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid,
	"session_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"event_type" text NOT NULL,
	"payload_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "negotiation_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"listing_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"current_offer_amount" numeric(12, 2) NOT NULL,
	"last_offer_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_offer_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"provider_message_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"payload_json" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"session_id" uuid,
	"listing_id" uuid NOT NULL,
	"sender_user_id" uuid NOT NULL,
	"offer_kind" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"sequence_no" integer NOT NULL,
	"parent_offer_id" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"title_snapshot" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_amount" numeric(12, 2) NOT NULL,
	"total_price_amount" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"session_id" uuid,
	"thread_id" uuid,
	"accepted_offer_id" uuid NOT NULL,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"subtotal_amount" numeric(12, 2) NOT NULL,
	"shipping_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"platform_fee_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"shipping_address_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_payment_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"paid_at" timestamp with time zone,
	"raw_response_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_user_id" uuid NOT NULL,
	"reported_user_id" uuid,
	"session_id" uuid,
	"listing_id" uuid,
	"message_id" uuid,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"reviewer_user_id" uuid NOT NULL,
	"reviewed_user_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_listings" (
	"user_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seller_follows" (
	"seller_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seller_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seller_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"business_name" text NOT NULL,
	"trade_mark" text,
	"cover_image_url" text,
	"sells_summary" text,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"rating_avg" numeric(3, 2),
	"rating_count" integer DEFAULT 0 NOT NULL,
	"follower_count" integer DEFAULT 0 NOT NULL,
	"completed_sales_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"delivery_mode" text NOT NULL,
	"carrier" text,
	"tracking_number" text,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"recipient_name" text NOT NULL,
	"phone_e164" text NOT NULL,
	"country" text NOT NULL,
	"state" text NOT NULL,
	"city" text NOT NULL,
	"line_1" text NOT NULL,
	"line_2" text,
	"postal_code" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"username" text NOT NULL,
	"avatar_url" text,
	"bio" text,
	"country_code" text,
	"city" text,
	"response_time_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"device_name" text,
	"platform" text,
	"ip_address" text,
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"push_enabled" boolean DEFAULT true NOT NULL,
	"sms_enabled" boolean DEFAULT true NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"show_online_status" boolean DEFAULT true NOT NULL,
	"preferred_currency" text DEFAULT 'USD' NOT NULL,
	"preferred_role" text DEFAULT 'buyer' NOT NULL,
	"seller_preferences" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"primary_role" text DEFAULT 'buyer' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"verification_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"document_urls_json" jsonb,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webrtc_peers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"connection_role" text,
	"peer_state" text,
	"last_heartbeat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "posts_table" CASCADE;--> statement-breakpoint
DROP TABLE "users_table" CASCADE;--> statement-breakpoint
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_otps" ADD CONSTRAINT "auth_otps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_user_id_users_id_fk" FOREIGN KEY ("blocker_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_user_id_users_id_fk" FOREIGN KEY ("blocked_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_impressions" ADD CONSTRAINT "feed_impressions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_impressions" ADD CONSTRAINT "feed_impressions_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_impressions" ADD CONSTRAINT "feed_impressions_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_inventory" ADD CONSTRAINT "listing_inventory_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_media" ADD CONSTRAINT "listing_media_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_service_meta" ADD CONSTRAINT "listing_service_meta_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_reminders" ADD CONSTRAINT "live_reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_reminders" ADD CONSTRAINT "live_reminders_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_session_listings" ADD CONSTRAINT "live_session_listings_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_session_listings" ADD CONSTRAINT "live_session_listings_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_session_media_assets" ADD CONSTRAINT "live_session_media_assets_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_session_participants" ADD CONSTRAINT "live_session_participants_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_session_participants" ADD CONSTRAINT "live_session_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_primary_listing_id_listings_id_fk" FOREIGN KEY ("primary_listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_receipts" ADD CONSTRAINT "message_receipts_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_receipts" ADD CONSTRAINT "message_receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_shared_listing_id_listings_id_fk" FOREIGN KEY ("shared_listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_events" ADD CONSTRAINT "negotiation_events_thread_id_negotiation_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."negotiation_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_events" ADD CONSTRAINT "negotiation_events_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_events" ADD CONSTRAINT "negotiation_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_threads" ADD CONSTRAINT "negotiation_threads_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_threads" ADD CONSTRAINT "negotiation_threads_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_threads" ADD CONSTRAINT "negotiation_threads_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_threads" ADD CONSTRAINT "negotiation_threads_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_thread_id_negotiation_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."negotiation_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_thread_id_negotiation_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."negotiation_threads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_accepted_offer_id_offers_id_fk" FOREIGN KEY ("accepted_offer_id") REFERENCES "public"."offers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_address_id_user_addresses_id_fk" FOREIGN KEY ("shipping_address_id") REFERENCES "public"."user_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_user_id_users_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewed_user_id_users_id_fk" FOREIGN KEY ("reviewed_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_listings" ADD CONSTRAINT "saved_listings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_listings" ADD CONSTRAINT "saved_listings_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_follows" ADD CONSTRAINT "seller_follows_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_follows" ADD CONSTRAINT "seller_follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_payouts" ADD CONSTRAINT "seller_payouts_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_payouts" ADD CONSTRAINT "seller_payouts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_profiles" ADD CONSTRAINT "seller_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_submissions" ADD CONSTRAINT "verification_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_submissions" ADD CONSTRAINT "verification_submissions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webrtc_peers" ADD CONSTRAINT "webrtc_peers_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webrtc_peers" ADD CONSTRAINT "webrtc_peers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_identities_user_id_idx" ON "auth_identities" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_identities_provider_uid_unique" ON "auth_identities" USING btree ("provider","provider_uid");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_identities_email_unique" ON "auth_identities" USING btree ("email") WHERE "email" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_identities_phone_unique" ON "auth_identities" USING btree ("phone_e164") WHERE "phone_e164" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "auth_otps_user_id_idx" ON "auth_otps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_otps_target_idx" ON "auth_otps" USING btree ("target");--> statement-breakpoint
CREATE INDEX "auth_otps_expires_at_idx" ON "auth_otps" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "blocks_blocker_user_id_blocked_user_id_unique" ON "blocks" USING btree ("blocker_user_id","blocked_user_id");--> statement-breakpoint
CREATE INDEX "categories_parent_id_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_participants_conversation_user_unique" ON "conversation_participants" USING btree ("conversation_id","user_id");--> statement-breakpoint
CREATE INDEX "conversation_participants_conversation_id_idx" ON "conversation_participants" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conversation_participants_user_id_idx" ON "conversation_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversations_last_message_at_desc_idx" ON "conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "conversations_session_id_idx" ON "conversations" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "feed_impressions_user_id_created_at_idx" ON "feed_impressions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "feed_impressions_session_id_idx" ON "feed_impressions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "feed_impressions_listing_id_idx" ON "feed_impressions" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listing_media_listing_id_sort_order_idx" ON "listing_media" USING btree ("listing_id","sort_order");--> statement-breakpoint
CREATE INDEX "listings_seller_id_status_created_at_idx" ON "listings" USING btree ("seller_id","status","created_at");--> statement-breakpoint
CREATE INDEX "listings_category_id_status_created_at_idx" ON "listings" USING btree ("category_id","status","created_at");--> statement-breakpoint
CREATE INDEX "listings_listing_type_status_idx" ON "listings" USING btree ("listing_type","status");--> statement-breakpoint
CREATE UNIQUE INDEX "live_reminders_user_id_session_id_unique" ON "live_reminders" USING btree ("user_id","session_id");--> statement-breakpoint
CREATE INDEX "live_reminders_user_id_idx" ON "live_reminders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "live_reminders_remind_at_idx" ON "live_reminders" USING btree ("remind_at");--> statement-breakpoint
CREATE UNIQUE INDEX "live_session_listings_session_id_listing_id_unique" ON "live_session_listings" USING btree ("session_id","listing_id");--> statement-breakpoint
CREATE INDEX "live_session_media_assets_session_id_idx" ON "live_session_media_assets" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "live_session_participants_session_id_user_id_unique" ON "live_session_participants" USING btree ("session_id","user_id");--> statement-breakpoint
CREATE INDEX "live_session_participants_session_id_idx" ON "live_session_participants" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "live_session_participants_user_id_idx" ON "live_session_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "live_sessions_status_scheduled_start_at_idx" ON "live_sessions" USING btree ("status","scheduled_start_at");--> statement-breakpoint
CREATE INDEX "live_sessions_status_actual_start_at_idx" ON "live_sessions" USING btree ("status","actual_start_at");--> statement-breakpoint
CREATE INDEX "live_sessions_seller_id_status_scheduled_start_at_idx" ON "live_sessions" USING btree ("seller_id","status","scheduled_start_at");--> statement-breakpoint
CREATE INDEX "message_attachments_message_id_idx" ON "message_attachments" USING btree ("message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "message_receipts_message_id_user_id_unique" ON "message_receipts" USING btree ("message_id","user_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "negotiation_events_thread_id_created_at_idx" ON "negotiation_events" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "negotiation_events_session_id_created_at_idx" ON "negotiation_events" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "negotiation_threads_seller_id_status_last_offer_at_idx" ON "negotiation_threads" USING btree ("seller_id","status","last_offer_at");--> statement-breakpoint
CREATE INDEX "negotiation_threads_buyer_id_status_last_offer_at_idx" ON "negotiation_threads" USING btree ("buyer_id","status","last_offer_at");--> statement-breakpoint
CREATE INDEX "negotiation_threads_listing_id_idx" ON "negotiation_threads" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "negotiation_threads_session_id_idx" ON "negotiation_threads" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "negotiation_threads_expires_at_idx" ON "negotiation_threads" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "notification_deliveries_notification_id_idx" ON "notification_deliveries" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "notification_deliveries_status_idx" ON "notification_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notifications_user_id_created_at_desc_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "offers_thread_id_sequence_no_idx" ON "offers" USING btree ("thread_id","sequence_no");--> statement-breakpoint
CREATE INDEX "offers_session_id_created_at_idx" ON "offers" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "offers_parent_offer_id_idx" ON "offers" USING btree ("parent_offer_id");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_buyer_id_status_created_at_idx" ON "orders" USING btree ("buyer_id","status","created_at");--> statement-breakpoint
CREATE INDEX "orders_seller_id_status_created_at_idx" ON "orders" USING btree ("seller_id","status","created_at");--> statement-breakpoint
CREATE INDEX "payments_order_id_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_provider_payment_id_idx" ON "payments" USING btree ("provider_payment_id");--> statement-breakpoint
CREATE INDEX "reports_reporter_user_id_status_created_at_idx" ON "reports" USING btree ("reporter_user_id","status","created_at");--> statement-breakpoint
CREATE INDEX "reports_reported_user_id_status_idx" ON "reports" USING btree ("reported_user_id","status");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_order_id_reviewer_user_id_reviewed_user_id_unique" ON "reviews" USING btree ("order_id","reviewer_user_id","reviewed_user_id");--> statement-breakpoint
CREATE INDEX "reviews_reviewed_user_id_idx" ON "reviews" USING btree ("reviewed_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_listings_user_id_listing_id_unique" ON "saved_listings" USING btree ("user_id","listing_id");--> statement-breakpoint
CREATE INDEX "saved_listings_user_id_idx" ON "saved_listings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seller_follows_seller_id_user_id_unique" ON "seller_follows" USING btree ("seller_id","user_id");--> statement-breakpoint
CREATE INDEX "seller_follows_seller_id_idx" ON "seller_follows" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "seller_payouts_seller_id_status_created_at_idx" ON "seller_payouts" USING btree ("seller_id","status","created_at");--> statement-breakpoint
CREATE INDEX "seller_profiles_verification_status_idx" ON "seller_profiles" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "shipments_order_id_idx" ON "shipments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "user_addresses_user_id_idx" ON "user_addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_profiles_username_idx" ON "user_profiles" USING btree ("username");--> statement-breakpoint
CREATE INDEX "user_profiles_country_code_idx" ON "user_profiles" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "user_sessions_revoked_at_idx" ON "user_sessions" USING btree ("revoked_at");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("primary_role");--> statement-breakpoint
CREATE INDEX "verification_submissions_user_id_verification_type_idx" ON "verification_submissions" USING btree ("user_id","verification_type");--> statement-breakpoint
CREATE INDEX "verification_submissions_status_idx" ON "verification_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "webrtc_peers_session_id_idx" ON "webrtc_peers" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "webrtc_peers_user_id_idx" ON "webrtc_peers" USING btree ("user_id");