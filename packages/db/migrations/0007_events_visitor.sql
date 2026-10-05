ALTER TABLE "events" ADD COLUMN "visitor" text;--> statement-breakpoint
CREATE INDEX "events_created_idx" ON "events" USING btree ("created_at");