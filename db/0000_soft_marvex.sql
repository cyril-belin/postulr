CREATE TYPE "public"."consent_type" AS ENUM('cv_processing', 'data_transfer_eu', 'marketing');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'pro');--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" "consent_type" NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"stripe_customer_id" text,
	"billing_current_period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consents_user_id_idx" ON "consents" USING btree ("user_id");