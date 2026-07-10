ALTER TABLE "listings" ALTER COLUMN "starting_amount" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "lowest_amount" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" DROP COLUMN "conditions";