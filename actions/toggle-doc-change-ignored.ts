import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";

type Change = { before: string; after: string; reasoning: string; ignored?: boolean };

export default defineAction({
  description:
    "Mark one before/after change within a tracked doc suggestion as ignored (excluded from future pull requests) or restore it. Does not delete the change.",
  schema: z.object({
    id: z.string().describe("Doc suggestion id"),
    index: z.number().int().min(0).describe("Zero-based index of the change within the suggestion's changes array"),
    ignored: z.boolean().describe("True to exclude this change from pull requests, false to include it again"),
  }),
  run: async ({ id, index, ignored }) => {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(schema.docSuggestions)
      .where(eq(schema.docSuggestions.id, id));
    if (!existing) fail("Doc suggestion not found.", { statusCode: 404 });

    const changes = JSON.parse(existing.changes) as Change[];
    if (index >= changes.length) {
      fail(`Change index ${index} is out of range (this suggestion has ${changes.length} change(s)).`, {
        statusCode: 400,
      });
    }

    changes[index] = { ...changes[index], ignored };

    const [updated] = await db
      .update(schema.docSuggestions)
      .set({ changes: JSON.stringify(changes) })
      .where(eq(schema.docSuggestions.id, id))
      .returning();

    return { ...updated, changes };
  },
});
