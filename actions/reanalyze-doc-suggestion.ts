import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";

export default defineAction({
  description:
    "Mark a tracked doc suggestion as re-analyzing, so a fresh before/after research pass can replace its previous result.",
  schema: z.object({
    id: z.string().describe("Doc suggestion id"),
  }),
  run: async ({ id }) => {
    const db = getDb();
    const [updated] = await db
      .update(schema.docSuggestions)
      .set({ analysisStatus: "analyzing" })
      .where(eq(schema.docSuggestions.id, id))
      .returning();
    if (!updated) fail("Doc suggestion not found.", { statusCode: 404 });
    return updated;
  },
});
