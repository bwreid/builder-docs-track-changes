import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER, githubRuntime } from "../server/lib/github.js";
import { jiraRuntime } from "../server/lib/jira.js";
import { reportDisplayName } from "../server/lib/report-display-name.js";

export default defineAction({
  description:
    "Re-apply each report's current display name to its tracked pull requests and Jira tickets, in case the report was renamed after they were created. Best-effort: silently skips anything that fails (not connected, PR/ticket no longer exists, etc).",
  schema: z.object({}),
  run: async (_args, ctx) => {
    if (!ctx?.userEmail) fail("Not authenticated.", { statusCode: 401 });

    const db = getDb();
    const [reports, suggestions] = await Promise.all([
      db.select().from(schema.reports),
      db.select().from(schema.docSuggestions),
    ]);

    const reportById = new Map(reports.map((report) => [report.id, report]));
    const prsByReport = new Map<string, Set<number>>();
    const ticketsByReport = new Map<string, Set<string>>();

    for (const suggestion of suggestions) {
      if (suggestion.prNumber != null) {
        const set = prsByReport.get(suggestion.reportId) ?? new Set<number>();
        set.add(suggestion.prNumber);
        prsByReport.set(suggestion.reportId, set);
      }
      if (suggestion.jiraIssueKey) {
        const set = ticketsByReport.get(suggestion.reportId) ?? new Set<string>();
        set.add(suggestion.jiraIssueKey);
        ticketsByReport.set(suggestion.reportId, set);
      }
    }

    let prsSynced = 0;
    for (const [reportId, prNumbers] of prsByReport) {
      const report = reportById.get(reportId);
      if (!report) continue;
      const title = `Docs update: ${reportDisplayName(report)}`;
      for (const prNumber of prNumbers) {
        try {
          await githubRuntime.executeRequest({
            provider: "github",
            method: "PATCH",
            path: `/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/pulls/${prNumber}`,
            body: { title },
          });
          prsSynced++;
        } catch (error) {
          console.error(`[sync-report-names] Failed to rename PR #${prNumber}:`, error);
        }
      }
    }

    let ticketsSynced = 0;
    for (const [reportId, issueKeys] of ticketsByReport) {
      const report = reportById.get(reportId);
      if (!report) continue;
      const summary = `Batch Agent-Native Changes: ${reportDisplayName(report)}`;
      for (const issueKey of issueKeys) {
        try {
          await jiraRuntime.executeRequest({
            provider: "jira",
            method: "PUT",
            path: `/rest/api/3/issue/${issueKey}`,
            body: { fields: { summary } },
          });
          ticketsSynced++;
        } catch (error) {
          console.error(`[sync-report-names] Failed to rename ticket ${issueKey}:`, error);
        }
      }
    }

    return { prsSynced, ticketsSynced };
  },
});
