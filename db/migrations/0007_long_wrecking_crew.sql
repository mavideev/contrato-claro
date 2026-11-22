ALTER TYPE "public"."document_role" ADD VALUE 'supporting';--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "label" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "text" text;