import { defineAction, fail } from "@agent-native/core/action";
import { getRequestUserEmail } from "@agent-native/core/server";
import { notify } from "@agent-native/core/notifications";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";

export default defineAction({
  description:
    "Save the before/after doc-change research for a tracked doc suggestion and mark its analysis ready. Call this after reading the live doc page and the report summary to find the exact sentences that should change.",
  schema: z.object({
    id: z.string().describe("Doc suggestion id"),
    analysisSummary: z
      .string()
      .min(1)
      .describe("Reasoning for why these changes are needed, grounded in the report summary"),
    changes: z
      .array(
        z.object({
          before: z.string().describe("The exact existing sentence(s) from the live doc page"),
          after: z.string().describe("The proposed replacement sentence(s)"),
          reasoning: z.string().describe("Why this specific change is needed"),
        }),
      )
      .min(1)
      .describe("Specific before/after sentence changes found on the doc page"),
  }),
  run: async ({ id, analysisSummary, changes }) => {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(schema.docSuggestions)
      .where(eq(schema.docSuggestions.id, id));
    if (!existing) fail("Doc suggestion not found.", { statusCode: 404 });

    // The agent always resubmits the full changes array, and its schema has
    // no `ignored` field — carry that flag forward by matching on `before`
    // text so a user's ignore choice isn't silently dropped by an unrelated
    // re-analysis (e.g. revising one change via chat, or a full re-suggest).
    const previousChanges = JSON.parse(existing.changes) as { before: string; ignored?: boolean }[];
    const mergedChanges = changes.map((change) => {
      const previous = previousChanges.find((p) => p.before === change.before);
      return previous?.ignored ? { ...change, ignored: true } : change;
    });

    const [updated] = await db
      .update(schema.docSuggestions)
      .set({
        analysisStatus: "ready",
        analysisSummary,
        changes: JSON.stringify(mergedChanges),
      })
      .where(eq(schema.docSuggestions.id, id))
      .returning();
    if (!updated) fail("Doc suggestion not found.", { statusCode: 404 });

    const owner = getRequestUserEmail();
    if (owner) {
      await notify(
        {
          severity: "info",
          title: "Doc change analysis ready",
          body: `${updated.title}: ${changes.length} suggested change${changes.length === 1 ? "" : "s"}.`,
          metadata: { docSuggestionId: id },
        },
        { owner },
      );
    }

    return updated;
  },
});
