import { defineAction, fail } from "@agent-native/core/action";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";

export default defineAction({
  description:
    "Get one change report and its merged-PR items, for the report detail view or for the agent to summarize.",
  schema: z.object({
    id: z.string().describe("Report id"),
  }),
  http: { method: "GET" },
  run: async ({ id }) => {
    const db = getDb();
    const [report] = await db
      .select()
      .from(schema.reports)
      .where(eq(schema.reports.id, id));
    if (!report) fail("Report not found.", { statusCode: 404 });

    const items = await db
      .select()
      .from(schema.reportItems)
      .where(eq(schema.reportItems.reportId, id))
      .orderBy(asc(schema.reportItems.mergedAt));

    const docsSuggestions = await db
      .select()
      .from(schema.docSuggestions)
      .where(eq(schema.docSuggestions.reportId, id))
      .orderBy(asc(schema.docSuggestions.createdAt), asc(schema.docSuggestions.id));

    return {
      ...report,
      docsSuggestions,
      items: items.map((item) => ({
        ...item,
        labels: JSON.parse(item.labels) as string[],
      })),
    };
  },
});
