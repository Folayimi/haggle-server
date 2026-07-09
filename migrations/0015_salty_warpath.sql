ALTER TABLE "user_settings" ALTER COLUMN "preferred_currency" SET DEFAULT 'NGN';--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;