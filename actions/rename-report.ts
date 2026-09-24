import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";

export default defineAction({
  description:
    "Set a report's user-chosen display name. Purely cosmetic — does not change the report's date range or any linked doc suggestions. Pass an empty name to clear it back to the date range.",
  schema: z.object({
    id: z.string().describe("Report id"),
    name: z.string().describe("New display name, or empty to reset to the date range"),
  }),
  run: async ({ id, name }) => {
    const db = getDb();
    const [existing] = await db.select().from(schema.reports).where(eq(schema.reports.id, id));
    if (!existing) fail("Report not found.", { statusCode: 404 });

    const trimmed = name.trim();
    const [updated] = await db
      .update(schema.reports)
      .set({ userChosenName: trimmed || null })
      .where(eq(schema.reports.id, id))
      .returning();

    return updated;
  },
});
