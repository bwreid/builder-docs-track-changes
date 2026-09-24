import { defineAction } from "@agent-native/core/action";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";

export default defineAction({
  description: "List all tracked doc suggestions across reports, most recently tracked first.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.docSuggestions.id,
        reportId: schema.docSuggestions.reportId,
        path: schema.docSuggestions.path,
        url: schema.docSuggestions.url,
        title: schema.docSuggestions.title,
        reason: schema.docSuggestions.reason,
        relatedHeading: schema.docSuggestions.relatedHeading,
        status: schema.docSuggestions.status,
        analysisStatus: schema.docSuggestions.analysisStatus,
        analysisSummary: schema.docSuggestions.analysisSummary,
        changes: schema.docSuggestions.changes,
        jiraIssueKey: schema.docSuggestions.jiraIssueKey,
        jiraIssueUrl: schema.docSuggestions.jiraIssueUrl,
        prNumber: schema.docSuggestions.prNumber,
        prUrl: schema.docSuggestions.prUrl,
        trackedAt: schema.docSuggestions.trackedAt,
        userChosenName: schema.docSuggestions.userChosenName,
        createdAt: schema.docSuggestions.createdAt,
        reportRangeStart: schema.reports.rangeStart,
        reportRangeEnd: schema.reports.rangeEnd,
        reportSummary: schema.reports.summary,
        reportUserChosenName: schema.reports.userChosenName,
      })
      .from(schema.docSuggestions)
      .innerJoin(schema.reports, eq(schema.docSuggestions.reportId, schema.reports.id))
      .where(eq(schema.docSuggestions.status, "tracked"))
      // Older tracked rows predate the trackedAt column — fall back to
      // createdAt so they still get a stable, sensible position.
      .orderBy(desc(sql`coalesce(${schema.docSuggestions.trackedAt}, ${schema.docSuggestions.createdAt})`));

    return rows.map((row) => ({
      ...row,
      changes: JSON.parse(row.changes) as {
        before: string;
        after: string;
        reasoning: string;
        ignored?: boolean;
      }[],
    }));
  },
});
