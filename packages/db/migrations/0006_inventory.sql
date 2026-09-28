CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"scan_id" uuid,
	"category" text NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"capacity" text,
	"condition" text NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"purchase_price_minor" integer NOT NULL,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text,
	"expected_sale_minor" integer,
	"expected_profit_minor" integer,
	"status" text DEFAULT 'bought' NOT NULL,
	"listed_on" text,
	"listed_price_minor" integer,
	"listed_at" timestamp with time zone,
	"sold_price_minor" integer,
	"sale_fees_minor" integer,
	"sale_shipping_minor" integer,
	"sold_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_user_idx" ON "inventory_items" USING btree ("user_id","status");