import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";

export default defineAction({
  description:
    'Set a doc suggestion\'s status: "new" (default), "ignored" (dismissed but kept visible), or "tracked" (queued for before/after doc-change research).',
  schema: z.object({
    id: z.string().describe("Doc suggestion id"),
    status: z.enum(["new", "ignored", "tracked"]),
  }),
  run: async ({ id, status }) => {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(schema.docSuggestions)
      .where(eq(schema.docSuggestions.id, id));
    if (!existing) fail("Doc suggestion not found.", { statusCode: 404 });

    const [updated] = await db
      .update(schema.docSuggestions)
      .set({
        status,
        // Only arm research the first time an item is tracked — re-tracking
        // after an untrack shouldn't discard a completed analysis.
        analysisStatus:
          status === "tracked" && !existing.analysisStatus ? "pending" : existing.analysisStatus,
      })
      .where(eq(schema.docSuggestions.id, id))
      .returning();

    return updated;
  },
});
