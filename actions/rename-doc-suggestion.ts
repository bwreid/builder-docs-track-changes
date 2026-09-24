import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";

export default defineAction({
  description:
    "Set a doc suggestion's user-chosen display name. Purely cosmetic — does not change the doc it's linked to. Pass an empty name to clear it back to the original title.",
  schema: z.object({
    id: z.string().describe("Doc suggestion id"),
    name: z.string().describe("New display name, or empty to reset to the original title"),
  }),
  run: async ({ id, name }) => {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(schema.docSuggestions)
      .where(eq(schema.docSuggestions.id, id));
    if (!existing) fail("Doc suggestion not found.", { statusCode: 404 });

    const trimmed = name.trim();
    const [updated] = await db
      .update(schema.docSuggestions)
      .set({ userChosenName: trimmed || null })
      .where(eq(schema.docSuggestions.id, id))
      .returning();

    return updated;
  },
});
