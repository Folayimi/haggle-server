ALTER TABLE "reset_auth_sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "reset_auth_sessions" CASCADE;--> statement-breakpoint
ALTER TABLE "user_sessions" RENAME COLUMN "refresh_token_hash" TO "refresh_token";--> statement-breakpoint
ALTER TABLE "user_sessions" RENAME COLUMN "device_name" TO "updated_at";--> statement-breakpoint
DROP INDEX "user_sessions_revoked_at_idx";--> statement-breakpoint
CREATE INDEX "user_sessions_refresh_token_idx" ON "user_sessions" USING btree ("refresh_token");--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "platform";--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "ip_address";--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "user_agent";--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_refresh_token_unique" UNIQUE("refresh_token");