import { defineAction } from "@agent-native/core/action";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";

export default defineAction({
  description: "List all tracked doc suggestions across reports, newest first.",
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
        createdAt: schema.docSuggestions.createdAt,
        reportRangeStart: schema.reports.rangeStart,
        reportRangeEnd: schema.reports.rangeEnd,
        reportSummary: schema.reports.summary,
      })
      .from(schema.docSuggestions)
      .innerJoin(schema.reports, eq(schema.docSuggestions.reportId, schema.reports.id))
      .where(eq(schema.docSuggestions.status, "tracked"))
      .orderBy(desc(schema.docSuggestions.createdAt));

    return rows.map((row) => ({
      ...row,
      changes: JSON.parse(row.changes) as { before: string; after: string; reasoning: string }[],
    }));
  },
});
