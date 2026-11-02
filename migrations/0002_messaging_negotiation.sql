ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_message_type_check";
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "message_type" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD COLUMN IF NOT EXISTS "last_read_message_id" uuid;
--> statement-breakpoint
ALTER TABLE "negotiation_threads" ADD COLUMN IF NOT EXISTS "conversation_id" uuid;
--> statement-breakpoint
ALTER TABLE "negotiation_threads" ADD COLUMN IF NOT EXISTS "quantity" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "negotiation_threads" ADD COLUMN IF NOT EXISTS "variant_snapshot" jsonb;
--> statement-breakpoint
ALTER TABLE "negotiation_threads" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "negotiation_threads" ADD CONSTRAINT "negotiation_threads_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "deals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "negotiation_id" uuid NOT NULL UNIQUE,
  "accepted_offer_id" uuid NOT NULL,
  "buyer_id" uuid NOT NULL,
  "seller_id" uuid NOT NULL,
  "listing_id" uuid NOT NULL,
  "amount" numeric(12, 2) NOT NULL,
  "currency" text NOT NULL,
  "quantity" integer NOT NULL,
  "variant_snapshot" jsonb,
  "status" text DEFAULT 'agreed' NOT NULL,
  "accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_negotiation_id_negotiation_threads_id_fk" FOREIGN KEY ("negotiation_id") REFERENCES "public"."negotiation_threads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_accepted_offer_id_offers_id_fk" FOREIGN KEY ("accepted_offer_id") REFERENCES "public"."offers"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "negotiation_threads_conversation_id_idx" ON "negotiation_threads" USING btree ("conversation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deals_buyer_id_created_at_idx" ON "deals" USING btree ("buyer_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deals_seller_id_created_at_idx" ON "deals" USING btree ("seller_id", "created_at");
