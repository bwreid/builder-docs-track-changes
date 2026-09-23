// App tables live here. Define each table with the framework's portable column
// helpers so the same schema works on local libSQL and hosted Postgres.
//
// After editing this file, run `pnpm db:generate` and restart the dev server
// (see `drizzle/START_HERE.md`).

import { sql } from "drizzle-orm";
import { integer, pgTable, text } from "drizzle-orm/pg-core";

// One row per report run: a time-boxed window of merged PRs on the tracked
// repo, plus the AI-written narrative summary once the agent produces it.
export const reports = pgTable("reports", {
  id: text("id").primaryKey(),
  rangeStart: text("range_start").notNull(),
  rangeEnd: text("range_end"),
  status: text("status", {
    enum: ["fetching", "summarizing", "ready", "error"],
  })
    .notNull()
    .default("fetching"),
  summary: text("summary"),
  // Brief paragraph on what documentation should change, written by the
  // agent alongside `summary`.
  docsSummary: text("docs_summary"),
  errorMessage: text("error_message"),
  itemCount: integer("item_count").notNull().default(0),
  // GitHub search link scoped to closed PRs in [rangeStart, rangeEnd] — the
  // "see everything" escape hatch now that the UI only shows the summary.
  prListUrl: text("pr_list_url").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

// One row per suggested doc update from a report. Paths are validated
// against server/lib/agent-native-docs-map.ts before insertion.
export const docSuggestions = pgTable("doc_suggestions", {
  id: text("id").primaryKey(),
  reportId: text("report_id")
    .notNull()
    .references(() => reports.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  reason: text("reason").notNull(),
  relatedHeading: text("related_heading").notNull(),
  status: text("status", { enum: ["new", "ignored", "tracked"] })
    .notNull()
    .default("new"),
  // Populated once a tracked item goes through before/after doc research.
  analysisStatus: text("analysis_status", {
    enum: ["pending", "analyzing", "ready", "error"],
  }),
  analysisSummary: text("analysis_summary"),
  // JSON-encoded array of { before, after, reasoning }.
  changes: text("changes").notNull().default("[]"),
  jiraIssueKey: text("jira_issue_key"),
  jiraIssueUrl: text("jira_issue_url"),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

// One row per merged PR captured by a report.
export const reportItems = pgTable("report_items", {
  id: text("id").primaryKey(),
  reportId: text("report_id")
    .notNull()
    .references(() => reports.id, { onDelete: "cascade" }),
  prNumber: integer("pr_number").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  author: text("author").notNull(),
  mergedAt: text("merged_at").notNull(),
  // JSON-encoded string array — no jsonb helper is exported by the portable
  // schema surface, and this app never needs to filter by individual labels.
  labels: text("labels").notNull().default("[]"),
  excerpt: text("excerpt").notNull().default(""),
});

// Singleton row holding the user-editable guidance the agent applies when
// deciding which docs need updating and what to change. Read by
// server/lib/criteria-store.ts.
export const criteria = pgTable("criteria", {
  id: text("id").primaryKey(),
  // What to look for when deciding a doc needs updating.
  selectionCriteria: text("selection_criteria").notNull().default(""),
  // How to write/format the summary and doc suggestions.
  outputFormat: text("output_format").notNull().default(""),
  // Tone to write with (e.g. casual, formal, technical).
  outputTone: text("output_tone").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
});

// The editable map of agent-native.com/docs pages this app suggests updates
// against. Seeded once from server/lib/agent-native-docs-map.ts, then owned
// by this table — edited by hand or refreshed via the re-scrape action.
export const docsMapEntries = pgTable("docs_map_entries", {
  path: text("path").primaryKey(),
  title: text("title").notNull(),
  // JSON-encoded string array of topic keywords.
  topics: text("topics").notNull().default("[]"),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
});
