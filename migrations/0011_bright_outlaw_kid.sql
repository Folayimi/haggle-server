ALTER TABLE "auth_sessions" RENAME COLUMN "refresh_token" TO "reset_token";--> statement-breakpoint
ALTER TABLE "auth_sessions" DROP CONSTRAINT "auth_sessions_refresh_token_unique";--> statement-breakpoint
DROP INDEX "auth_sessions_reset_token_idx";--> statement-breakpoint
CREATE INDEX "auth_sessions_reset_token_idx" ON "auth_sessions" USING btree ("reset_token");--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_reset_token_unique" UNIQUE("reset_token");