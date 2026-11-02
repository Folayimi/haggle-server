ALTER TABLE "user_profiles" ADD COLUMN "website_address" text;
--> statement-breakpoint
ALTER TABLE "user_profiles" DROP COLUMN "country_code";
--> statement-breakpoint
ALTER TABLE "user_profiles" DROP COLUMN "city";
--> statement-breakpoint
ALTER TABLE "user_addresses" ADD COLUMN "country_code" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_addresses" ALTER COLUMN "country_code" DROP DEFAULT;
