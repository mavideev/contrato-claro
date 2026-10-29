ALTER TABLE "plans" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;