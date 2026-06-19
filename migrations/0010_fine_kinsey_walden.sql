DROP INDEX "auth_sessions_refresh_token_idx";--> statement-breakpoint
CREATE INDEX "auth_sessions_reset_token_idx" ON "auth_sessions" USING btree ("refresh_token");