CREATE TABLE "ebay_accounts" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"ebay_user_id" text NOT NULL,
	"username" text,
	"refresh_token_enc" text NOT NULL,
	"refresh_expires_at" timestamp with time zone NOT NULL,
	"postal_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ebay_accounts" ADD CONSTRAINT "ebay_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;