// DB-backed accessor for the singleton `criteria` row — user-editable
// guidance the agent applies when deciding which docs need updating and
// what to change (see the Criteria page and drizzle/schema.ts).
import { eq } from "drizzle-orm";

import { getDb, schema } from "../db.js";

const CRITERIA_ID = "default";

export interface CriteriaContent {
  selectionCriteria: string;
  outputFormat: string;
  outputTone: string;
}

// Before this page existed, selectionCriteria/outputFormat were hardcoded
// directly into the report-summarization prompt in app/routes/_index.tsx.
// These are that same guidance, moved here so a fresh install behaves the
// same way while the text becomes genuinely editable — the prompt no longer
// hardcodes it. outputTone is modeled on Builder's own docs (Projects Setup
// Overview, 101: Structure, Create a pull request).
export const CRITERIA_DEFAULTS: CriteriaContent = {
  selectionCriteria:
    "Flag a doc page only when a PR changes something a user of the app would " +
    "notice: new capabilities, behavior changes, bug fixes that affect " +
    "behavior, or breaking changes. Ignore internal refactors, tests, and " +
    "tooling changes with no user-visible effect. Match themes from the " +
    "report summary to doc pages by topic, and prefer the most specific " +
    "matching page over a general overview page.",
  outputFormat:
    "Write the report summary as Markdown with one heading per theme, " +
    "focused only on what changed in the application — ignore anything " +
    "documentation-related in that summary, since docs impact is covered " +
    "separately. Keep the docs-impact summary to one brief paragraph.",
  outputTone: [
    "- Be straightforward. Keep paragraphs to a few sentences, with little to no marketing language — just tell the reader exactly what to do or what happens.",
    "- Use imperative, cause-and-effect language (\"Click X, and Y happens\"). Describe how things work; don't guess at what the user wants.",
    "- Structure with headings, not buried paragraphs. Use a heading whenever you introduce a new step, concept, or section, rather than nesting detail inside a longer paragraph.",
    "- Follow the Google Developer Style Guide (developers.google.com/style): use \"you\", avoid \"we\", use lists correctly, and prefer plain, understandable language over jargon.",
    "- Be specific without being overly technical. When a technical detail is unavoidable, explain it in a way a non-expert reader can follow.",
    "- Use numbered lists for sequential steps and bulleted lists for options or choices — never bury a procedure inside prose.",
    "- Bold UI elements (button and menu names) and key terms the first time they're introduced, e.g. \"click the **Send PR** button.\"",
    "- Define jargon in one plain sentence right where it's introduced (e.g. \"A branch is a copy of the codebase at the current moment.\"), not in a separate glossary.",
    "- Open each page or section with one or two short sentences orienting the reader, then move straight into the structured how-to content.",
    "- Ground abstract instructions with a concrete example (a real sample prompt or input) rather than describing them only in the abstract.",
    "- Write in confident, definite statements about what happens (\"Builder immediately begins to apply the changes\"), not hedged language like \"might\" or \"could.\"",
    "- Skip hype adjectives and exclamation points. Stay neutral and factual even when describing a feature's benefit.",
    "- Link to the authoritative page for a topic instead of re-explaining it — keep each page focused on its own subject.",
  ].join("\n"),
};

export async function getCriteria(): Promise<CriteriaContent> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.criteria)
    .where(eq(schema.criteria.id, CRITERIA_ID));
  if (!row) return CRITERIA_DEFAULTS;
  // Per-field fallback, not just when the row is entirely missing: a row
  // saved before outputTone existed has outputTone === "" from the column's
  // ALTER TABLE default, which is indistinguishable from "never touched" —
  // both should show the default rather than a blank box.
  return {
    selectionCriteria: row.selectionCriteria || CRITERIA_DEFAULTS.selectionCriteria,
    outputFormat: row.outputFormat || CRITERIA_DEFAULTS.outputFormat,
    outputTone: row.outputTone || CRITERIA_DEFAULTS.outputTone,
  };
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
