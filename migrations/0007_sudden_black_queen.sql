CREATE TABLE "reset_auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verification_id" uuid NOT NULL,
	"reset_token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reset_auth_sessions_reset_token_unique" UNIQUE("reset_token")
);
--> statement-breakpoint
ALTER TABLE "reset_auth_sessions" ADD CONSTRAINT "reset_auth_sessions_verification_id_reset_email_verifications_id_fk" FOREIGN KEY ("verification_id") REFERENCES "public"."reset_email_verifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reset_auth_sessions_verification_id_idx" ON "reset_auth_sessions" USING btree ("verification_id");--> statement-breakpoint
CREATE INDEX "reset_auth_sessions_refresh_token_idx" ON "reset_auth_sessions" USING btree ("reset_token");--> statement-breakpoint
CREATE INDEX "reset_auth_sessions_expires_at_idx" ON "reset_auth_sessions" USING btree ("expires_at");