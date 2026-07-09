ALTER TABLE "seller_profiles" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "seller_profiles" CASCADE;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "primary_role" text DEFAULT 'buyer' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "business_name" text;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "trade_mark" text;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "cover_image_url" text;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "sells_summary" text;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "verification_status" text DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "rating_avg" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "rating_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "follower_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "completed_sales_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "user_profiles_verification_status_idx" ON "user_profiles" USING btree ("verification_status");--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_email_unique" UNIQUE("email");