CREATE TABLE "product_identifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"method" text NOT NULL,
	"model_version" text NOT NULL,
	"gtin" text,
	"image_count" integer DEFAULT 0 NOT NULL,
	"candidates" jsonb NOT NULL,
	"confusable_models" jsonb NOT NULL,
	"condition_guess" text,
	"identifying_text" jsonb NOT NULL,
	"top_confidence" real,
	"chosen_index" integer,
	"final_product" jsonb,
	"corrected" boolean,
	"correction" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"identification_id" uuid,
	"input_method" text NOT NULL,
	"category" text NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"capacity" text,
	"mount" text,
	"gtin" text,
	"product" jsonb NOT NULL,
	"condition" text NOT NULL,
	"purchase_price_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"scan_id" uuid,
	"identification_id" uuid,
	"kind" text NOT NULL,
	"provider" text NOT NULL,
	"model" text,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"calls" integer DEFAULT 1 NOT NULL,
	"cost_micro_usd" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_device_key_unique" UNIQUE("device_key")
);
--> statement-breakpoint
CREATE TABLE "valuations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"status" text NOT NULL,
	"insufficient_reason" text,
	"data_kind" text,
	"currency" text NOT NULL,
	"fast_sale_minor" integer,
	"expected_sale_minor" integer,
	"high_sale_minor" integer,
	"estimated_fees_minor" integer,
	"estimated_shipping_minor" integer,
	"expected_net_minor" integer,
	"expected_profit_minor" integer,
	"roi_bp" integer,
	"max_buy_minor" integer,
	"confidence_score" real,
	"confidence_level" text,
	"confidence_factors" jsonb,
	"decision" text,
	"decision_factors" jsonb,
	"risks" jsonb,
	"included_count" integer NOT NULL,
	"fetched_count" integer NOT NULL,
	"exclusion_counts" jsonb NOT NULL,
	"distribution" jsonb,
	"sites" jsonb,
	"fee_profile_id" text NOT NULL,
	"fx_rate_date" text,
	"fx_source" text,
	"pricing_algorithm_version" text NOT NULL,
	"recognition_model_version" text,
	"data_fetched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_identifications" ADD CONSTRAINT "product_identifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_identification_id_product_identifications_id_fk" FOREIGN KEY ("identification_id") REFERENCES "public"."product_identifications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_costs" ADD CONSTRAINT "usage_costs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_costs" ADD CONSTRAINT "usage_costs_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_costs" ADD CONSTRAINT "usage_costs_identification_id_product_identifications_id_fk" FOREIGN KEY ("identification_id") REFERENCES "public"."product_identifications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "valuations" ADD CONSTRAINT "valuations_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_identifications_user_idx" ON "product_identifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "scans_user_idx" ON "scans" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "usage_costs_created_idx" ON "usage_costs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "valuations_scan_idx" ON "valuations" USING btree ("scan_id");