import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";

export default defineAction({
  description: "Delete a report and its captured PR items.",
  schema: z.object({
    id: z.string().describe("Report id"),
  }),
  http: { method: "DELETE" },
  run: async ({ id }) => {
    const db = getDb();
    const [deleted] = await db
      .delete(schema.reports)
      .where(eq(schema.reports.id, id))
      .returning();
    if (!deleted) fail("Report not found.", { statusCode: 404 });
    return deleted;
  },
});
