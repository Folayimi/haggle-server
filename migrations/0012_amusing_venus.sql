ALTER TABLE "listings" RENAME COLUMN "price_amount" TO "starting_amount";--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "price_currency" SET DEFAULT 'NGN';--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "conditions" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "lowest_amount" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "auto_decline_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "negotiation_style" text DEFAULT 'negotiable' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "negotiation_note" text;--> statement-breakpoint
ALTER TABLE "listings" DROP COLUMN "is_negotiable";