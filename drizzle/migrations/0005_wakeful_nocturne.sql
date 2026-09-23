CREATE TABLE "criteria" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "docs_map_entries" (
	"path" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"topics" text DEFAULT '[]' NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
