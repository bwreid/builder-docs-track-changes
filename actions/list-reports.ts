import { defineAction } from "@agent-native/core/action";
import { asc, desc, inArray } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";

export default defineAction({
  description: "List change reports, most recently created first.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.reports)
      .orderBy(desc(schema.reports.createdAt));

    if (rows.length === 0) return [];

    const suggestions = await db
      .select()
      .from(schema.docSuggestions)
      .where(
        inArray(
          schema.docSuggestions.reportId,
          rows.map((r) => r.id),
        ),
      )
      .orderBy(asc(schema.docSuggestions.createdAt), asc(schema.docSuggestions.id));

    return rows.map((row) => ({
      ...row,
      docsSuggestions: suggestions.filter((s) => s.reportId === row.id),
    }));
  },
});
