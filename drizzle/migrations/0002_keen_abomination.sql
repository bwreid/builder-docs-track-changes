ALTER TABLE "reports" ADD COLUMN "docs_summary" text;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "docs_suggestions" text DEFAULT '[]' NOT NULL;