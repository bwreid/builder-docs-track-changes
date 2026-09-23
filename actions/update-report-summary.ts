import { defineAction, fail } from "@agent-native/core/action";
import { getRequestUserEmail } from "@agent-native/core/server";
import { notify } from "@agent-native/core/notifications";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { DOCS_BASE_URL, getDocsMap } from "../server/lib/docs-map-store.js";

export default defineAction({
  description:
    "Save the AI-written narrative summary and documentation-impact notes for a report, and mark it ready. Call this after reading the report's PR items, writing a themed summary of feature changes (excluding docs), and calling list-docs-topics to pick real doc paths.",
  schema: z.object({
    reportId: z.string().describe("Report id"),
    summary: z
      .string()
      .min(1)
      .describe(
        "Narrative summary of feature changes grouped by theme, as Markdown headings. Do not include a documentation-updates section here — that goes in docsSummary/docsSuggestions.",
      ),
    docsSummary: z
      .string()
      .min(1)
      .describe("A brief paragraph describing what documentation should change based on this report."),
    docsSuggestions: z
      .array(
        z.object({
          path: z
            .string()
            .describe("Doc path from list-docs-topics, e.g. /docs/what-is-agent-native/"),
          reason: z.string().describe("Why this doc likely needs updating"),
          relatedHeading: z
            .string()
            .describe("The exact heading text in `summary` this suggestion came from, for anchor linking"),
        }),
      )
      .default([])
      .describe("Suggested docs to review, sourced from list-docs-topics only"),
  }),
  run: async ({ reportId, summary, docsSummary, docsSuggestions }) => {
    const db = getDb();
    const docsMap = await getDocsMap();

    // Never persist a doc link we didn't already know was real.
    const validSuggestions = docsSuggestions.filter((s) => s.path in docsMap);

    const [updated] = await db
      .update(schema.reports)
      .set({ summary, docsSummary, status: "ready" })
      .where(eq(schema.reports.id, reportId))
      .returning();
    if (!updated) fail("Report not found.", { statusCode: 404 });

    if (validSuggestions.length > 0) {
      await db.insert(schema.docSuggestions).values(
        validSuggestions.map((s) => ({
          id: crypto.randomUUID(),
          reportId,
          path: s.path,
          url: `${DOCS_BASE_URL}${s.path}`,
          title: docsMap[s.path].title,
          reason: s.reason,
          relatedHeading: s.relatedHeading,
        })),
      );
    }

    const owner = getRequestUserEmail();
    if (owner) {
      await notify(
        {
          severity: "info",
          title: "Report summary ready",
          body: `${updated.itemCount} merged PR${updated.itemCount === 1 ? "" : "s"} summarized.`,
          metadata: { reportId },
        },
        { owner },
      );
    }

    return updated;
  },
});
