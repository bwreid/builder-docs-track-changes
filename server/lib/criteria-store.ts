// DB-backed accessor for the singleton `criteria` row — user-editable
// guidance the agent applies when deciding which docs need updating and
// what to change (see the Criteria page and drizzle/schema.ts).
import { eq } from "drizzle-orm";

import { getDb, schema } from "../db.js";

const CRITERIA_ID = "default";

export interface CriteriaContent {
  selectionCriteria: string;
  outputFormat: string;
}

const EMPTY: CriteriaContent = { selectionCriteria: "", outputFormat: "" };

export async function getCriteria(): Promise<CriteriaContent> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.criteria)
    .where(eq(schema.criteria.id, CRITERIA_ID));
  if (!row) return EMPTY;
  return { selectionCriteria: row.selectionCriteria, outputFormat: row.outputFormat };
}

export async function setCriteria(content: CriteriaContent): Promise<CriteriaContent> {
  const db = getDb();
  await db
    .insert(schema.criteria)
    .values({ id: CRITERIA_ID, ...content, updatedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: schema.criteria.id,
      set: { ...content, updatedAt: new Date().toISOString() },
    });
  return content;
}
