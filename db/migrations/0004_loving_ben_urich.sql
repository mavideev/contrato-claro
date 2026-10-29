CREATE TYPE "public"."billing_mode" AS ENUM('one_time', 'subscription');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('pending', 'authorized', 'paused', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."payment_kind" ADD VALUE 'topup';--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"price_cents" bigint NOT NULL,
	"page_quota" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "subscription_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"page_quota" integer NOT NULL,
	"pages_used" integer DEFAULT 0 NOT NULL,
	"extra_pages_granted" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_cycles_subscriptionId_periodStart_unique" UNIQUE("subscription_id","period_start")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"plan_id" uuid NOT NULL,
	"mp_preapproval_id" text,
	"status" "subscription_status" DEFAULT 'pending' NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_mpPreapprovalId_unique" UNIQUE("mp_preapproval_id")
);
--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "analysis_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "billing_mode" "billing_mode" DEFAULT 'one_time' NOT NULL;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "subscription_cycle_id" uuid;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "pages_charged" integer;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "subscription_cycle_id" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "pages_granted" integer;--> statement-breakpoint
ALTER TABLE "rechecks" ADD COLUMN "subscription_cycle_id" uuid;--> statement-breakpoint
ALTER TABLE "rechecks" ADD COLUMN "pages_charged" integer;--> statement-breakpoint
ALTER TABLE "subscription_cycles" ADD CONSTRAINT "subscription_cycles_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscriptions_user_id_index" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_subscription_cycle_id_subscription_cycles_id_fk" FOREIGN KEY ("subscription_cycle_id") REFERENCES "public"."subscription_cycles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_cycle_id_subscription_cycles_id_fk" FOREIGN KEY ("subscription_cycle_id") REFERENCES "public"."subscription_cycles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rechecks" ADD CONSTRAINT "rechecks_subscription_cycle_id_subscription_cycles_id_fk" FOREIGN KEY ("subscription_cycle_id") REFERENCES "public"."subscription_cycles"("id") ON DELETE set null ON UPDATE no action;