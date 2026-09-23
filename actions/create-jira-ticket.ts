import { defineAction, fail } from "@agent-native/core/action";
import { readAppSecret } from "@agent-native/core/secrets";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  JIRA_ISSUE_TYPE_ID,
  JIRA_LABELS,
  JIRA_PROJECT_ID,
  jiraRuntime,
} from "../server/lib/jira.js";
import { getDb, schema } from "../server/db.js";

type AdfNode = Record<string, unknown>;

function paragraph(...content: AdfNode[]): AdfNode {
  return { type: "paragraph", content };
}

function text(value: string): AdfNode {
  return { type: "text", text: value };
}

function link(label: string, href: string): AdfNode {
  return { type: "text", text: label, marks: [{ type: "link", attrs: { href } }] };
}

export default defineAction({
  description:
    "Create a Jira ticket in the Customer Education project for a tracked documentation suggestion.",
  schema: z.object({
    suggestionId: z.string().describe("Doc suggestion id"),
  }),
  run: async ({ suggestionId }, ctx) => {
    const userEmail = ctx?.userEmail;
    if (!userEmail) fail("Not authenticated.", { statusCode: 401 });

    const db = getDb();
    const [suggestion] = await db
      .select()
      .from(schema.docSuggestions)
      .where(eq(schema.docSuggestions.id, suggestionId));
    if (!suggestion) fail("Doc suggestion not found.", { statusCode: 404 });
    if (suggestion.jiraIssueKey) {
      return { key: suggestion.jiraIssueKey, url: suggestion.jiraIssueUrl };
    }

    const [report] = await db
      .select()
      .from(schema.reports)
      .where(eq(schema.reports.id, suggestion.reportId));
    if (!report) fail("Source report not found.", { statusCode: 404 });

    const changes = JSON.parse(suggestion.changes) as {
      before: string;
      after: string;
      reasoning: string;
    }[];

    const content: AdfNode[] = [
      paragraph(
        text(
          "Agent-Native flagged this documentation page for an update based on a recent Agent-Native change report.",
        ),
      ),
      paragraph(text("Doc page: "), link(suggestion.title, suggestion.url)),
      paragraph(text(suggestion.reason)),
    ];

    for (const change of changes) {
      content.push(
        paragraph(text("Before: " + change.before)),
        paragraph(text("After: " + change.after)),
        paragraph(text("Why: " + change.reasoning)),
      );
    }

    if (report.prListUrl) {
      content.push(
        paragraph(
          text("Related pull requests: "),
          link("view merged PRs on GitHub", report.prListUrl),
        ),
      );
    }

    let created: {
      key?: unknown;
      id?: unknown;
      errorMessages?: unknown;
      errors?: unknown;
    };
    try {
      created = (await jiraRuntime.executeRequest({
        provider: "jira",
        method: "POST",
        path: "/rest/api/3/issue",
        body: {
          fields: {
            project: { id: JIRA_PROJECT_ID },
            issuetype: { id: JIRA_ISSUE_TYPE_ID },
            summary: 'Docs: update "' + suggestion.title + '"',
            description: { type: "doc", version: 1, content },
            labels: JIRA_LABELS,
          },
        },
      })) as typeof created;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("not connected")) {
        fail("Jira isn't set up yet. Add your Jira details in Settings and try again.", {
          errorCode: "jira_not_connected",
        });
      }
      throw error;
    }

    const key = typeof created.key === "string" ? created.key : null;
    if (!key) {
      // Jira returns 2xx-shaped responses through executeRequest even for
      // rejected creates (bad project/issue-type id, missing required
      // field, etc.) — surface its actual reason instead of a blind 502.
      console.error("[create-jira-ticket] Jira did not return an issue key:", JSON.stringify(created));
      const jiraErrors: string[] = [];
      if (Array.isArray(created.errorMessages)) {
        jiraErrors.push(...created.errorMessages.filter((m): m is string => typeof m === "string"));
      }
      if (created.errors && typeof created.errors === "object") {
        for (const value of Object.values(created.errors as Record<string, unknown>)) {
          if (typeof value === "string") jiraErrors.push(value);
        }
      }
      fail(
        jiraErrors.length > 0
          ? `Jira rejected the ticket: ${jiraErrors.join("; ")}`
          : "Jira did not return an issue key.",
        { statusCode: 502 },
      );
    }

    let url: string | null = null;
    const baseUrlSecret = await readAppSecret({
      key: "JIRA_BASE_URL",
      scope: "user",
      scopeId: userEmail,
    });
    const baseUrl = baseUrlSecret?.value?.trim().replace(/\/+$/, "");
    if (baseUrl) {
      url = baseUrl + "/browse/" + key;
    }

    await db
      .update(schema.docSuggestions)
      .set({ jiraIssueKey: key, jiraIssueUrl: url })
      .where(eq(schema.docSuggestions.id, suggestionId));

    return { key, url };
  },
});
