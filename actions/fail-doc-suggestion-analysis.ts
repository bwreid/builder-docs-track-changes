import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";

export default defineAction({
  description:
    "Mark a tracked doc suggestion's analysis as failed (e.g. the doc page could not be fetched), with a short reason.",
  schema: z.object({
    id: z.string().describe("Doc suggestion id"),
    reason: z.string().min(1).describe("Short explanation of why the analysis failed"),
  }),
  run: async ({ id, reason }) => {
    const db = getDb();
    const [updated] = await db
      .update(schema.docSuggestions)
      .set({ analysisStatus: "error", analysisSummary: reason })
      .where(eq(schema.docSuggestions.id, id))
      .returning();
    if (!updated) fail("Doc suggestion not found.", { statusCode: 404 });
    return updated;
  },
});
