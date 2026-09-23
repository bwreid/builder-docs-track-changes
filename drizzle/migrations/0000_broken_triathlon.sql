CREATE TABLE "report_items" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"pr_number" integer NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"author" text NOT NULL,
	"merged_at" text NOT NULL,
	"labels" text DEFAULT '[]' NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"range_start" text NOT NULL,
	"range_end" text,
	"status" text DEFAULT 'fetching' NOT NULL,
	"summary" text,
	"error_message" text,
	"item_count" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_items" ADD CONSTRAINT "report_items_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;