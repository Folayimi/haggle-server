CREATE TABLE "posts_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"content" text NOT NULL,
	"price" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
DROP TABLE "products_table" CASCADE;--> statement-breakpoint
ALTER TABLE "posts_table" ADD CONSTRAINT "posts_table_user_id_users_table_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_table"("id") ON DELETE no action ON UPDATE no action;