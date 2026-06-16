CREATE TABLE "reset_email_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"token" text,
	"otp_code" text,
	"type" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reset_email_verifications" ADD CONSTRAINT "reset_email_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reset_email_verifications_user_id_idx" ON "reset_email_verifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reset_email_verifications_email_idx" ON "reset_email_verifications" USING btree ("email");--> statement-breakpoint
CREATE INDEX "reset_email_verifications_token_idx" ON "reset_email_verifications" USING btree ("token");--> statement-breakpoint
CREATE INDEX "reset_email_verifications_otp_code_idx" ON "reset_email_verifications" USING btree ("otp_code");--> statement-breakpoint
CREATE INDEX "reset_email_verifications_expires_at_idx" ON "reset_email_verifications" USING btree ("expires_at");