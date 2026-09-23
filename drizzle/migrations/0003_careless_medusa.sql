CREATE TABLE "doc_suggestions" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"path" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"reason" text NOT NULL,
	"related_heading" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"analysis_status" text,
	"analysis_summary" text,
	"changes" text DEFAULT '[]' NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "doc_suggestions" ADD CONSTRAINT "doc_suggestions_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" DROP COLUMN "docs_suggestions";